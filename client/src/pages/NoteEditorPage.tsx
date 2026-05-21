import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  Focus,
  Hash,
  Link2,
  PanelRight,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { Toolbar } from '@/components/editor/Toolbar';
import { PresenceBar } from '@/components/editor/PresenceBar';
import { AutoSaveIndicator } from '@/components/note/AutoSaveIndicator';
// import { MembersModal } from '@/components/workspace/MembersModal';
import { ShareNoteModal } from '@/components/note/ShareNoteModal';import { Skeleton } from '@/components/ui/Skeleton';
import { useGetNoteQuery, useUpdateNoteMutation, useGetWorkspacesQuery } from '@/store/api';
import { useAppDispatch, useAppSelector, selectIsOffline, selectSaveStatus, selectUser, selectResolvingNoteIds } from '@/store';
import { setSaveStatus, setActiveNote } from '@/store/noteSlice';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useDebounce } from '@/hooks/useDebounce';
import { db } from '@/lib/db';
import { isBlankHtml } from '@/utils/noteContent';
import { cn } from '@/utils/cn';
import type { Editor } from '@tiptap/react';
import type { Note } from '@/types';

interface OutlineItem {
  id: string;
  text: string;
  level: number;
}

interface NoteSnapshot {
  id: string;
  title: string;
  content: string;
  savedAt: string;
}

const SNAPSHOT_KEY_PREFIX = 'notecraft_note_snapshots:';

function getSnapshotKey(noteId: string) {
  return `${SNAPSHOT_KEY_PREFIX}${noteId}`;
}

function loadSnapshots(noteId: string): NoteSnapshot[] {
  try {
    const raw = localStorage.getItem(getSnapshotKey(noteId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    localStorage.removeItem(getSnapshotKey(noteId));
    return [];
  }
}

function storeSnapshot(noteId: string, title: string, content: string) {
  if (!noteId || !content.trim()) return;
  const snapshots = loadSnapshots(noteId);
  if (snapshots[0]?.title === title && snapshots[0]?.content === content) return;
  const next = [
    { id: `${Date.now()}`, title: title || 'Untitled', content, savedAt: new Date().toISOString() },
    ...snapshots,
  ].slice(0, 10);
  localStorage.setItem(getSnapshotKey(noteId), JSON.stringify(next));
}

function extractOutline(html: string): OutlineItem[] {
  const root = document.createElement('div');
  root.innerHTML = html;
  return Array.from(root.querySelectorAll('h1, h2, h3'))
    .map((heading, index) => ({
      id: `heading-${index}`,
      text: heading.textContent?.trim() || 'Untitled heading',
      level: Number(heading.tagName.slice(1)),
    }));
}

function formatSnapshotTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function NoteEditorPage() {
  const { id: workspaceId = '', noteId = '' } = useParams<{ id: string; noteId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isOffline = useAppSelector(selectIsOffline);
  const saveStatus = useAppSelector(selectSaveStatus);
  const currentUser = useAppSelector(selectUser);
  const isResolvingThisNote = useAppSelector(state => selectResolvingNoteIds(state).includes(noteId));

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  // const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);  // The resolved note — either from server or from IDB when offline
  const [resolvedNote, setResolvedNote] = useState<Note | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [snapshots, setSnapshots] = useState<NoteSnapshot[]>([]);

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

  const paragraphCount = content
    ? (new DOMParser().parseFromString(content, 'text/html').body.textContent || '')
      .split(/\n+/)
      .filter(Boolean).length || (content.trim() ? 1 : 0)
    : 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));
  const outline = extractOutline(content);
  const pendingOfflineChanges = hasPendingSync;

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

  const rememberSnapshot = useCallback((nextTitle: string, nextContent: string) => {
    storeSnapshot(noteId, nextTitle, nextContent);
    setSnapshots(loadSnapshots(noteId));
  }, [noteId]);

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
    setSnapshots(loadSnapshots(noteId));
    setIsStatsOpen(false);
    setIsOutlineOpen(false);
    setIsHistoryOpen(false);
    setHasPendingSync(false);
    lastSavedContentRef.current = '';
    lastSavedTitleRef.current = '';
    dispatch(setSaveStatus('saved'));
    return () => clearTimeout(cursorTimerRef.current);
  }, [noteId, dispatch]);

  useEffect(() => {
    if (!noteId) return;
    let cancelled = false;
    db.syncQueue
      .where('noteId')
      .equals(noteId)
      .toArray()
      .then(items => {
        if (!cancelled) setHasPendingSync(items.some(item => item.needsSync));
      })
      .catch(() => {
        if (!cancelled) setHasPendingSync(false);
      });
    return () => {
      cancelled = true;
    };
  }, [noteId, saveStatus]);

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

  useEffect(() => {
    const handleResolvedNote = (event: Event) => {
      const note = (event as CustomEvent<{ note?: Note }>).detail?.note;
      if (!note || note.id !== noteId) return;

      const nextContent = note.content || '';
      isHydratingRef.current = true;
      skipNextAutosaveRef.current = true;
      userEditedRef.current = false;
      contentLoadedRef.current = true;

      setResolvedNote(note);
      setTitle(note.title);
      setContent(nextContent);
      lastSavedContentRef.current = nextContent;
      lastSavedTitleRef.current = note.title;

      editorInstance?.commands.setContent(nextContent || '<p></p>', false);

      const tmp = document.createElement('div');
      tmp.innerHTML = nextContent;
      const text = tmp.textContent || '';
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
      setCharCount(text.length);
      dispatch(setSaveStatus('saved'));

      queueMicrotask(() => {
        isHydratingRef.current = false;
      });
    };

    window.addEventListener('notecraft:note-resolved', handleResolvedNote);
    return () => window.removeEventListener('notecraft:note-resolved', handleResolvedNote);
  }, [dispatch, editorInstance, noteId]);

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
    if (isResolvingThisNote) return;

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
      if (isResolvingThisNote) return;

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
          setHasPendingSync(true);
        }
        lastSavedContentRef.current = debouncedContent;
        lastSavedTitleRef.current = debouncedTitle;
        rememberSnapshot(debouncedTitle, debouncedContent);
        setHasPendingSync(false);
        userEditedRef.current = false;
        dispatch(setSaveStatus('offline'));
        return;
      }

      try {
        await updateNote({ id: noteId, title: debouncedTitle, content: debouncedContent }).unwrap();
        lastSavedContentRef.current = debouncedContent;
        lastSavedTitleRef.current = debouncedTitle;
        rememberSnapshot(debouncedTitle, debouncedContent);
        userEditedRef.current = false;
        dispatch(setSaveStatus('saved'));
      } catch {
        dispatch(setSaveStatus('error'));
        toast.error('Failed to save — check your connection');
      }
    };

    save();
  }, [debouncedContent, debouncedTitle, noteId, isOffline, isResolvingThisNote, dispatch, updateNote, rememberSnapshot]);

  // Ctrl/Cmd+S
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!noteId) return;
        if (isResolvingThisNote) return;
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
          setHasPendingSync(true);
          dispatch(setSaveStatus('offline'));
          toast('Saved locally — will sync when online', { icon: '📴' });
          return;
        }

        try {
          await updateNote({ id: noteId, title, content }).unwrap();
          lastSavedContentRef.current = content;
          lastSavedTitleRef.current = title;
          rememberSnapshot(title, content);
          setHasPendingSync(false);
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
  }, [noteId, title, content, resolvedNote, isOffline, isResolvingThisNote, dispatch, updateNote, rememberSnapshot]);

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

  const handleManualSave = useCallback(async () => {
    if (!noteId || isResolvingThisNote) return;
    dispatch(setSaveStatus('saving'));

    if (resolvedNote) {
      await db.notes.put({
        ...resolvedNote,
        title,
        content,
        updatedAt: new Date().toISOString(),
      });
    }

    if (isOffline) {
      await db.syncQueue.put({ noteId, needsSync: true });
      setHasPendingSync(true);
      rememberSnapshot(title, content);
      dispatch(setSaveStatus('offline'));
      toast('Saved locally — will sync when online', { icon: '📴' });
      return;
    }

    try {
      await updateNote({ id: noteId, title, content }).unwrap();
      lastSavedContentRef.current = content;
      lastSavedTitleRef.current = title;
      userEditedRef.current = false;
      rememberSnapshot(title, content);
      setHasPendingSync(false);
      dispatch(setSaveStatus('saved'));
      toast.success('Saved');
    } catch {
      dispatch(setSaveStatus('error'));
      toast.error('Save failed');
    }
  }, [content, dispatch, isOffline, isResolvingThisNote, noteId, rememberSnapshot, resolvedNote, title, updateNote]);

  const handleCopyCode = useCallback(async () => {
    if (!editorInstance) return;
    const { $from } = editorInstance.state.selection;
    const node = $from.parent.type.name === 'codeBlock' ? $from.parent : null;
    const text = node?.textContent;
    if (!text) {
      toast.error('Place the cursor inside a code block first');
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success('Code copied');
  }, [editorInstance]);

  const handleRestoreSnapshot = useCallback((snapshot: NoteSnapshot) => {
    isHydratingRef.current = true;
    skipNextAutosaveRef.current = true;
    userEditedRef.current = true;
    contentLoadedRef.current = true;
    setTitle(snapshot.title);
    setContent(snapshot.content);
    editorInstance?.commands.setContent(snapshot.content || '<p></p>', false);
    dispatch(setSaveStatus('saving'));
    queueMicrotask(() => {
      isHydratingRef.current = false;
    });
    setIsHistoryOpen(false);
    toast('Snapshot restored — save to keep it', { icon: '↩' });
  }, [dispatch, editorInstance]);

  const handleOutlineJump = useCallback((index: number) => {
    const editorElement = document.querySelector('.ProseMirror');
    const heading = editorElement?.querySelectorAll('h1, h2, h3')[index];
    heading?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      <div className={cn(
        'h-14 shrink-0 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm z-30',
        isFocusMode ? 'hidden' : 'flex'
      )}>
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
          {workspace && (
            <span className="hidden lg:inline text-xs text-gray-400 dark:text-gray-600">
              {workspace.name} / {title || 'Untitled'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <PresenceBar collaborators={collaborators} />
          {pendingOfflineChanges && (
            <span className="hidden md:inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              Offline changes pending
            </span>
          )}
          <AutoSaveIndicator status={saveStatus} />
          <button
            type="button"
            onClick={() => void handleManualSave()}
            disabled={isResolvingThisNote}
            title="Save now"
            aria-label="Save now"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <Save className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStatsOpen(v => !v)}
              className="hidden sm:flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label="Document statistics"
            >
              <Hash className="h-3.5 w-3.5" />
              <span>{wordCount}w · {charCount}c</span>
            </button>
            {isStatsOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <div className="flex justify-between py-1"><span>Words</span><strong>{wordCount}</strong></div>
                <div className="flex justify-between py-1"><span>Characters</span><strong>{charCount}</strong></div>
                <div className="flex justify-between py-1"><span>Paragraphs</span><strong>{paragraphCount}</strong></div>
                <div className="flex justify-between py-1"><span>Reading time</span><strong>{readingMinutes} min</strong></div>
                <div className="flex justify-between py-1"><span>Last edited</span><strong>{resolvedNote?.updatedAt ? formatSnapshotTime(resolvedNote.updatedAt) : 'Now'}</strong></div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsHistoryOpen(v => !v);
              setIsOutlineOpen(false);
            }}
            title="Recent snapshots"
            aria-label="Recent snapshots"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <Clock3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOutlineOpen(v => !v);
              setIsHistoryOpen(false);
            }}
            title="Document outline"
            aria-label="Document outline"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <PanelRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsFocusMode(true)}
            title="Focus mode"
            aria-label="Focus mode"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <Focus className="h-4 w-4" />
          </button>
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
      <div className={cn('shrink-0 z-20', isFocusMode && 'hidden')}>
        <Toolbar editor={editorInstance} noteTitle={title} onCopyCode={handleCopyCode} />
      </div>

      {/* Editor */}
      <div className="relative flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
        {isFocusMode && (
          <button
            type="button"
            onClick={() => setIsFocusMode(false)}
            aria-label="Exit focus mode"
            className="fixed right-4 top-4 z-40 rounded-lg bg-white p-2 text-gray-500 shadow-md transition-colors hover:text-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className={cn(
          'mx-auto bg-white dark:bg-gray-950 shadow-md rounded-sm transition-all',
          isFocusMode ? 'my-0 min-h-full max-w-5xl shadow-none' : 'my-6 max-w-4xl'
        )}>
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

        {(isOutlineOpen || isHistoryOpen) && !isFocusMode && (
          <aside className="fixed right-4 top-32 z-30 w-72 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                {isHistoryOpen ? <Clock3 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                {isHistoryOpen ? 'Recent snapshots' : 'Outline'}
              </div>
              <button
                type="button"
                onClick={() => { setIsOutlineOpen(false); setIsHistoryOpen(false); }}
                aria-label="Close panel"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-auto p-2">
              {isOutlineOpen && (
                outline.length > 0 ? outline.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOutlineJump(index)}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    style={{ paddingLeft: `${8 + (item.level - 1) * 12}px` }}
                  >
                    {item.text}
                  </button>
                )) : (
                  <p className="px-2 py-6 text-center text-sm text-gray-400">Add headings to build an outline.</p>
                )
              )}
              {isHistoryOpen && (
                snapshots.length > 0 ? snapshots.map(snapshot => (
                  <div key={snapshot.id} className="rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{snapshot.title}</p>
                        <p className="text-xs text-gray-400">{formatSnapshotTime(snapshot.savedAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snapshot)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        aria-label="Restore snapshot"
                        title="Restore snapshot"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="px-2 py-6 text-center text-sm text-gray-400">Snapshots appear after saves.</p>
                )
              )}
            </div>
          </aside>
        )}
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
