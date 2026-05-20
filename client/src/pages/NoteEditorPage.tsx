import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { Toolbar } from '@/components/editor/Toolbar';
import { PresenceBar } from '@/components/editor/PresenceBar';
import { AutoSaveIndicator } from '@/components/note/AutoSaveIndicator';
// import { MembersModal } from '@/components/workspace/MembersModal';
import { ShareNoteModal } from '@/components/note/ShareNoteModal';import { Skeleton } from '@/components/ui/Skeleton';
import { useGetNoteQuery, useUpdateNoteMutation, useGetWorkspacesQuery } from '@/store/api';
import { useAppDispatch, useAppSelector, selectIsOffline, selectSaveStatus, selectUser } from '@/store';
import { setSaveStatus, setActiveNote } from '@/store/noteSlice';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useDebounce } from '@/hooks/useDebounce';
import { db } from '@/lib/db';
import { isBlankHtml } from '@/utils/noteContent';
import type { Editor } from '@tiptap/react';
import type { Note } from '@/types';

export function NoteEditorPage() {
  const { id: workspaceId = '', noteId = '' } = useParams<{ id: string; noteId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isOffline = useAppSelector(selectIsOffline);
  const saveStatus = useAppSelector(selectSaveStatus);
  const currentUser = useAppSelector(selectUser);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  // const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);  // The resolved note — either from server or from IDB when offline
  const [resolvedNote, setResolvedNote] = useState<Note | null>(null);

  const debouncedContent = useDebounce(content, 1500);
  const debouncedTitle = useDebounce(title, 1500);

  const userEditedRef = useRef(false);
  const contentLoadedRef = useRef(false);
  /** Blocks note-change until editor finished loading (prevents mount empty broadcast) */
  const isHydratingRef = useRef(true);
  /** Skip one autosave cycle after remote/collaborator content is applied */
  const skipNextAutosaveRef = useRef(false);
  const lastSavedContentRef = useRef('');
  const lastSavedTitleRef = useRef('');
  const activeNoteIdRef = useRef(noteId);
  activeNoteIdRef.current = noteId;

  const {
    data: serverNote,
    isLoading,
    isError,
  } = useGetNoteQuery(noteId, {
    skip: !noteId,
    refetchOnMountOrArgChange: true,
  });

  const { data: workspaces } = useGetWorkspacesQuery();
  const workspace = workspaces?.find(w => w.id === workspaceId);
  const isOwner = workspace?.ownerId === currentUser?.id;

  const [updateNote] = useUpdateNoteMutation();
  const {
    collaborators,
    sessionId,
    isReadOnly: collabReadOnly,
    setOnRemoteContent,
    broadcastChange,
    broadcastCursor,
  } = useCollaboration(noteId);

  const cursorTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset when noteId changes
  useEffect(() => {
    userEditedRef.current = false;
    contentLoadedRef.current = false;
    isHydratingRef.current = true;
    setTitle('');
    setContent('');
    setWordCount(0);
    setCharCount(0);
    setResolvedNote(null);
    lastSavedContentRef.current = '';
    lastSavedTitleRef.current = '';
    dispatch(setSaveStatus('saved'));
    return () => clearTimeout(cursorTimerRef.current);
  }, [noteId, dispatch]);

  // When server note arrives — only for the active noteId (avoid stale RTK cache)
  useEffect(() => {
    if (!serverNote || serverNote.id !== noteId) return;
    setResolvedNote(serverNote);
    // Do not overwrite local edits when refetch runs after autosave
    if (!userEditedRef.current) {
      const serverContent = serverNote.content || '';
      setTitle(serverNote.title);
      setContent(serverContent);
      lastSavedContentRef.current = serverContent;
      lastSavedTitleRef.current = serverNote.title;
    }
    contentLoadedRef.current = true;
  }, [serverNote, noteId]);

  // When server fetch fails (offline) — fall back to IndexedDB
  useEffect(() => {
    if (!isError || !noteId) return;

    const loadFromIDB = async () => {
      try {
        const cached = await db.notes.get(noteId);
        if (cached && cached.id === noteId) {
          setResolvedNote(cached);
          setTitle(cached.title);
          setContent(cached.content || '');
          contentLoadedRef.current = true;
          dispatch(setSaveStatus('offline'));
          toast('Showing offline version', { icon: '📴' });
        }
      } catch {
        // IDB not available
      }
    };

    loadFromIDB();
  }, [isError, noteId, dispatch]);

  // Track active note
  useEffect(() => {
    dispatch(setActiveNote(noteId));
    return () => { dispatch(setActiveNote(null)); };
  }, [noteId, dispatch]);

  // Auto-save (debounced) — only toggles status here, not on every keystroke
  useEffect(() => {
    if (!userEditedRef.current || !noteId) return;

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    if (
      debouncedContent === lastSavedContentRef.current &&
      debouncedTitle === lastSavedTitleRef.current
    ) {
      return;
    }

    const savingForNoteId = noteId;

    const save = async () => {
      if (activeNoteIdRef.current !== savingForNoteId) return;

      dispatch(setSaveStatus('saving'));

      // Always write to IDB first (works offline too)
      if (resolvedNote) {
        try {
          await db.notes.put({
            ...resolvedNote,
            title: debouncedTitle,
            content: debouncedContent,
            updatedAt: new Date().toISOString(),
          });
        } catch { /* non-fatal */ }
      }

      if (isOffline) {
        if (noteId) {
          await db.syncQueue.put({ noteId, needsSync: true });
        }
        lastSavedContentRef.current = debouncedContent;
        lastSavedTitleRef.current = debouncedTitle;
        userEditedRef.current = false;
        dispatch(setSaveStatus('offline'));
        return;
      }

      try {
        await updateNote({ id: noteId, title: debouncedTitle, content: debouncedContent }).unwrap();
        lastSavedContentRef.current = debouncedContent;
        lastSavedTitleRef.current = debouncedTitle;
        userEditedRef.current = false;
        dispatch(setSaveStatus('saved'));
      } catch {
        dispatch(setSaveStatus('error'));
        toast.error('Failed to save — check your connection');
      }
    };

    save();
  }, [debouncedContent, debouncedTitle, noteId, isOffline, dispatch, updateNote]);

  // Ctrl/Cmd+S
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!noteId) return;
        dispatch(setSaveStatus('saving'));

        // Save to IDB always
        if (resolvedNote) {
          try {
            await db.notes.put({
              ...resolvedNote,
              title,
              content,
              updatedAt: new Date().toISOString(),
            });
          } catch { /* non-fatal */ }
        }

        if (isOffline) {
          await db.syncQueue.put({ noteId, needsSync: true });
          dispatch(setSaveStatus('offline'));
          toast('Saved locally — will sync when online', { icon: '📴' });
          return;
        }

        try {
          await updateNote({ id: noteId, title, content }).unwrap();
          lastSavedContentRef.current = content;
          lastSavedTitleRef.current = title;
          userEditedRef.current = false;
          dispatch(setSaveStatus('saved'));
          toast.success('Saved');
        } catch {
          dispatch(setSaveStatus('error'));
          toast.error('Save failed');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [noteId, title, content, resolvedNote, isOffline, dispatch, updateNote]);

  const handleEditorHydrated = useCallback(() => {
    isHydratingRef.current = false;
  }, []);

  const handleCursorChange = useCallback(
    (anchor: number, head: number) => {
      if (isHydratingRef.current || collabReadOnly) return;
      clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = setTimeout(() => {
        broadcastCursor(anchor, head);
      }, 80);
    },
    [broadcastCursor, collabReadOnly]
  );

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    if (!contentLoadedRef.current || isHydratingRef.current) return;
    userEditedRef.current = true;
    skipNextAutosaveRef.current = false;

    // Broadcast only real edits — never blank mount state
    if (!isBlankHtml(newContent)) {
      broadcastChange(newContent, title);
    }

    const tmp = document.createElement('div');
    tmp.innerHTML = newContent;
    const text = tmp.textContent || '';
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    setCharCount(text.length);
  }, [broadcastChange, title]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!contentLoadedRef.current || isHydratingRef.current) return;
    userEditedRef.current = true;
    skipNextAutosaveRef.current = false;
    const newTitle = e.target.value;
    setTitle(newTitle);
    const html = editorInstance?.getHTML() ?? content;
    if (!isBlankHtml(html)) {
      broadcastChange(html, newTitle);
    }
  }, [broadcastChange, content, editorInstance]);

  const handleEditorReady = useCallback((editor: Editor) => {
    setEditorInstance(editor);
  }, []);

  // Register the remote updater so content from other users updates the editor
  const handleRegisterRemoteUpdater = useCallback((updater: (content: string, title: string) => void) => {
    setOnRemoteContent((incomingContent: string, incomingTitle: string) => {
      isHydratingRef.current = true;
      skipNextAutosaveRef.current = true;
      contentLoadedRef.current = true;
      setContent(incomingContent);
      if (incomingTitle) {
        setTitle(prev => (incomingTitle !== prev ? incomingTitle : prev));
      }
      updater(incomingContent, incomingTitle);
      // End hydration after snapshot/remote apply (next tick avoids mount onUpdate)
      queueMicrotask(() => {
        isHydratingRef.current = false;
      });
    });
  }, [setOnRemoteContent]);

  // Show skeleton only on first load (not on offline fallback)
  if (isLoading && !resolvedNote) {
    return (
      <div className="flex flex-col h-screen bg-white dark:bg-gray-950">
        <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-6 gap-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="h-12 border-b border-gray-200 dark:border-gray-800" />
        <div className="flex-1 p-8 space-y-4 max-w-4xl mx-auto w-full">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}`)}
            aria-label="Back to workspace"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            aria-label="Note title"
            className="text-lg font-semibold bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none w-64 sm:w-96"
          />
        </div>

        <div className="flex items-center gap-3">
          <PresenceBar collaborators={collaborators} />
          <AutoSaveIndicator status={saveStatus} />
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
            <Hash className="h-3.5 w-3.5" />
            <span>{wordCount}w · {charCount}c</span>
          </div>
          {workspace && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsShareOpen(true)}
                aria-label="Share this note"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors"
              >
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 z-20">
        <Toolbar editor={editorInstance} />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto my-6 bg-white dark:bg-gray-950 shadow-md rounded-sm">
          <TipTapEditor
            key={noteId}
            noteId={noteId}
            initialContent={
              resolvedNote && resolvedNote.id === noteId
                ? (resolvedNote.content ?? '')
                : undefined
            }
            onChange={handleContentChange}
            onEditorReady={handleEditorReady}
            onEditorHydrated={handleEditorHydrated}
            onRegisterRemoteUpdater={handleRegisterRemoteUpdater}
            onCursorChange={handleCursorChange}
            collaborators={collaborators}
            sessionId={sessionId}
            isReadOnly={collabReadOnly}
          />
        </div>
      </div>

      {workspace && resolvedNote && (
        <ShareNoteModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          note={resolvedNote}
          workspace={workspace}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
