import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { Toolbar } from '@/components/editor/Toolbar';
import { PresenceBar } from '@/components/editor/PresenceBar';
import { AutoSaveIndicator } from '@/components/note/AutoSaveIndicator';
import { MembersModal } from '@/components/workspace/MembersModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useGetNoteQuery, useUpdateNoteMutation, useGetWorkspacesQuery } from '@/store/api';
import { useAppDispatch, useAppSelector, selectIsOffline, selectSaveStatus, selectUser } from '@/store';
import { setSaveStatus, setActiveNote } from '@/store/noteSlice';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useDebounce } from '@/hooks/useDebounce';
import { db } from '@/lib/db';
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
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  // The resolved note — either from server or from IDB when offline
  const [resolvedNote, setResolvedNote] = useState<Note | null>(null);

  const debouncedContent = useDebounce(content, 1500);
  const debouncedTitle = useDebounce(title, 1500);

  const userEditedRef = useRef(false);
  const contentLoadedRef = useRef(false);

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
  const { collaborators } = useCollaboration(noteId);

  // Reset when noteId changes
  useEffect(() => {
    userEditedRef.current = false;
    contentLoadedRef.current = false;
    setTitle('');
    setContent('');
    setWordCount(0);
    setCharCount(0);
    setResolvedNote(null);
    dispatch(setSaveStatus('saved'));
  }, [noteId, dispatch]);

  // When server note arrives — use it
  useEffect(() => {
    if (!serverNote) return;
    setResolvedNote(serverNote);
    setTitle(serverNote.title);
    setContent(serverNote.content || '');
    contentLoadedRef.current = true;
  }, [serverNote]);

  // When server fetch fails (offline) — fall back to IndexedDB
  useEffect(() => {
    if (!isError || !noteId) return;

    const loadFromIDB = async () => {
      try {
        const cached = await db.notes.get(noteId);
        if (cached) {
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

  // Auto-save
  useEffect(() => {
    if (!userEditedRef.current || !noteId) return;

    const save = async () => {
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
        dispatch(setSaveStatus('offline'));
        return;
      }

      try {
        await updateNote({ id: noteId, title: debouncedTitle, content: debouncedContent }).unwrap();
        dispatch(setSaveStatus('saved'));
      } catch {
        dispatch(setSaveStatus('error'));
        toast.error('Failed to save — check your connection');
      }
    };

    save();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent, debouncedTitle]);

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

  const handleContentChange = useCallback((newContent: string) => {
    // Always update content state — needed for correct save payload
    setContent(newContent);

    // Only mark as user-edited and trigger save after initial load
    if (!contentLoadedRef.current) return;
    userEditedRef.current = true;
    dispatch(setSaveStatus('saving'));

    const tmp = document.createElement('div');
    tmp.innerHTML = newContent;
    const text = tmp.textContent || '';
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    setCharCount(text.length);
  }, [dispatch]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    userEditedRef.current = true;
    setTitle(e.target.value);
    dispatch(setSaveStatus('saving'));
  }, [dispatch]);

  const handleEditorReady = useCallback((editor: Editor) => {
    setEditorInstance(editor);
  }, []);

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
            <button
              onClick={() => setIsMembersOpen(true)}
              aria-label="Share"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
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
            noteId={noteId}
            initialContent={resolvedNote?.content ?? ''}
            onChange={handleContentChange}
            onEditorReady={handleEditorReady}
            collaborators={collaborators}
          />
        </div>
      </div>

      {workspace && (
        <MembersModal
          isOpen={isMembersOpen}
          onClose={() => setIsMembersOpen(false)}
          workspace={workspace}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
