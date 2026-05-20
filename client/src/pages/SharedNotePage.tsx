import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PenLine, Eye, Edit3, Users, AlertTriangle } from 'lucide-react';
import { useGetPublicNoteQuery } from '@/store/api';
import { useCollaboration } from '@/hooks/useCollaboration';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { Toolbar } from '@/components/editor/Toolbar';
import { PresenceBar } from '@/components/editor/PresenceBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAppSelector, selectUser } from '@/store';
import { useUpdateNoteMutation } from '@/store/api';
import { useDebounce } from '@/hooks/useDebounce';
import { isBlankHtml } from '@/utils/noteContent';
import type { Editor } from '@tiptap/react';
import type { PublicNote } from '@/types';

export function SharedNotePage() {
  const { token = '' } = useParams<{ token: string }>();
  const currentUser = useAppSelector(selectUser);

  const { data: note, isLoading, isError } = useGetPublicNoteQuery(token, { skip: !token });

  const {
    collaborators,
    sessionId,
    isReadOnly,
    sharePermission,
    setOnRemoteContent,
    broadcastChange,
    broadcastCursor,
  } = useCollaboration(note?.id ?? '', {
    shareToken: token,
    forceReadOnly: note?.sharePermission === 'view',
  });

  const cursorTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [contentLoaded, setContentLoaded] = useState(false);
  const [userEdited, setUserEdited] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);

  const debouncedContent = useDebounce(content, 1500);
  const [updateNote] = useUpdateNoteMutation();

  useEffect(() => {
    if (note && !contentLoaded) {
      setContent(note.content || '');
      setContentLoaded(true);
    }
  }, [note, contentLoaded]);

  // Auto-save for edit-permission users
  useEffect(() => {
    if (!userEdited || !note?.id || isReadOnly) return;
    const save = async () => {
      setSaveStatus('saving');
      try {
        await updateNote({ id: note.id, content: debouncedContent }).unwrap();
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
      }
    };
    save();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    if (!contentLoaded || isHydrating) return;
    setUserEdited(true);
    setSaveStatus('saving');
    if (!isBlankHtml(newContent)) {
      broadcastChange(newContent, note?.title ?? '');
    }
  }, [contentLoaded, isHydrating, broadcastChange, note?.title]);

  const handleEditorHydrated = useCallback(() => {
    setIsHydrating(false);
  }, []);

  const handleCursorChange = useCallback(
    (anchor: number, head: number) => {
      if (isHydrating || isReadOnly) return;
      clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = setTimeout(() => {
        broadcastCursor(anchor, head);
      }, 80);
    },
    [broadcastCursor, isHydrating, isReadOnly]
  );

  const handleEditorReady = useCallback((editor: Editor) => {
    setEditorInstance(editor);
  }, []);

  // Register remote content updater
  const handleRegisterRemoteUpdater = useCallback(
    (updater: (content: string, title: string) => void) => {
      setOnRemoteContent((incomingContent: string, incomingTitle: string) => {
        setIsHydrating(true);
        setContent(incomingContent);
        setContentLoaded(true);
        updater(incomingContent, incomingTitle);
        queueMicrotask(() => setIsHydrating(false));
      });
    },
    [setOnRemoteContent]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
        <SharedHeader note={null} sharePermission={null} collaborators={[]} />
        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (isError || !note) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center gap-4 px-4">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Link not found</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This share link may have been revoked or doesn't exist.
          </p>
          <Link to="/" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Go to NoteCraft →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <SharedHeader
        note={note}
        sharePermission={sharePermission}
        collaborators={collaborators}
        saveStatus={saveStatus}
        currentUserName={currentUser?.name}
      />

      {/* Toolbar — only shown for edit permission */}
      {!isReadOnly && (
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-14 z-20">
          <Toolbar editor={editorInstance} />
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto">
        <div className="max-w-4xl mx-auto my-6 bg-white dark:bg-gray-950 shadow-md rounded-sm">
          <TipTapEditor
            key={note.id}
            noteId={note.id}
            initialContent={contentLoaded ? (note.content ?? '') : undefined}
            onChange={handleContentChange}
            onEditorReady={handleEditorReady}
            onEditorHydrated={handleEditorHydrated}
            onRegisterRemoteUpdater={handleRegisterRemoteUpdater}
            onCursorChange={handleCursorChange}
            collaborators={collaborators}
            sessionId={sessionId}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-4 py-2 rounded-full shadow-lg">
          <Eye className="h-3.5 w-3.5" />
          View only — you can't edit this note
        </div>
      )}
    </div>
  );
}

// ─── Shared page header ───────────────────────────────────────────────────────
interface SharedHeaderProps {
  note: PublicNote | null;
  sharePermission: 'view' | 'edit' | null;
  collaborators: ReturnType<typeof useCollaboration>['collaborators'];
  saveStatus?: 'saved' | 'saving' | 'idle';
  currentUserName?: string;
}

function SharedHeader({ note, sharePermission, collaborators, saveStatus, currentUserName }: SharedHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white hover:opacity-80 transition-opacity">
          <PenLine className="h-5 w-5 text-brand-600" />
          <span className="hidden sm:inline text-sm">NoteCraft</span>
        </Link>
        {note && (
          <>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
              {note.title || 'Untitled'}
            </h1>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Presence */}
        {collaborators.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-gray-400" />
            <PresenceBar collaborators={collaborators} maxVisible={4} />
          </div>
        )}

        {/* Save status */}
        {saveStatus === 'saving' && (
          <span className="text-xs text-gray-400 animate-pulse">Saving…</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-xs text-green-500">Saved</span>
        )}

        {/* Permission badge */}
        {sharePermission && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            sharePermission === 'edit'
              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {sharePermission === 'edit' ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {sharePermission === 'edit' ? 'Editing' : 'Viewing'}
          </span>
        )}

        {/* Auth CTA for anonymous users */}
        {!currentUserName && (
          <Link to="/signup"
            className="text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            Sign up free
          </Link>
        )}
        {currentUserName && (
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            {currentUserName}
          </span>
        )}
      </div>
    </header>
  );
}
