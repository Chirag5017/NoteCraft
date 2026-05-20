import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket, connectSocket } from '@/lib/socket';
import { generateCollaboratorColor } from '@/lib/yjs';
import { useAppSelector, selectUser } from '@/store';
import { isBlankHtml } from '@/utils/noteContent';
import type { Collaborator } from '@/types';

interface UseCollaborationOptions {
  shareToken?: string;
  forceReadOnly?: boolean;
}

export function useCollaboration(
  noteId: string,
  options: UseCollaborationOptions = {}
) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [sharePermission, setSharePermission] = useState<'view' | 'edit' | null>(null);
  const [sessionId, setSessionId] = useState('');

  // The editor registers this callback so we can push remote content into it
  const onRemoteContentRef = useRef<((content: string, title: string) => void) | null>(null);
  const activeNoteIdRef = useRef(noteId);
  activeNoteIdRef.current = noteId;

  const currentUser = useAppSelector(selectUser);
  const { shareToken, forceReadOnly } = options;

  const setOnRemoteContent = useCallback(
    (cb: ((content: string, title: string) => void) | null) => {
      onRemoteContentRef.current = cb;
    },
    []
  );

  useEffect(() => {
    if (!noteId) return;

    setCollaborators([]);

    const socket = getSocket();

    // Ensure connected
    if (!socket.connected) {
      if (!currentUser) {
        socket.auth = {};
        socket.connect();
      } else {
        const token = localStorage.getItem('notecraft_token') ?? '';
        connectSocket(token);
      }
    }

    // Join hydration — only for this socket, never from peers
    const handleNoteSnapshot = (data: {
      noteId: string;
      content: string;
      title: string;
    }) => {
      if (data.noteId !== activeNoteIdRef.current) return;
      onRemoteContentRef.current?.(data.content, data.title);
    };

    // Live edit from another user in the same note room
    const handleNoteContent = (data: {
      noteId: string;
      content: string;
      title: string;
      fromUserId?: string;
      fromName?: string;
    }) => {
      if (data.noteId !== activeNoteIdRef.current) return;
      // Never let a peer's empty mount/open wipe our editor
      if (data.fromUserId && isBlankHtml(data.content)) return;
      onRemoteContentRef.current?.(data.content, data.title);
    };

    // ── Presence ──────────────────────────────────────────────────────────
    const handleUserJoined = (collaborator: Collaborator) => {
      setCollaborators(prev => {
        if (prev.some(c => c.userId === collaborator.userId)) return prev;
        return [...prev, collaborator];
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setCollaborators(prev => prev.filter(c => c.userId !== data.userId));
    };

    const handlePresenceList = (data: { collaborators: Collaborator[] }) => {
      setCollaborators(data.collaborators);
    };

    const handleSharePermission = (data: { sharePermission: 'view' | 'edit' }) => {
      setSharePermission(data.sharePermission);
    };

    const handleSessionInfo = (data: { sessionId: string }) => {
      setSessionId(data.sessionId);
    };

    const handleCursorUpdate = (data: {
      noteId: string;
      userId: string;
      name: string;
      color: string;
      anchor: number;
      head: number;
    }) => {
      if (data.noteId !== activeNoteIdRef.current) return;
      setCollaborators(prev => {
        const idx = prev.findIndex(c => c.userId === data.userId);
        const next: Collaborator = {
          userId: data.userId,
          name: data.name,
          color: data.color,
          cursor: { anchor: data.anchor, head: data.head },
        };
        if (idx === -1) return [...prev, next];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...next };
        return copy;
      });
    };

    socket.on('session-info', handleSessionInfo);
    socket.on('note-snapshot', handleNoteSnapshot);
    socket.on('note-content', handleNoteContent);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('presence-list', handlePresenceList);
    socket.on('share-permission', handleSharePermission);
    socket.on('cursor-update', handleCursorUpdate);

    // ── Join the room ──────────────────────────────────────────────────────
    const joinPayload: Record<string, unknown> = { noteId };
    if (shareToken) joinPayload.shareToken = shareToken;
    if (currentUser) {
      joinPayload.user = {
        userId: currentUser.id,
        name: currentUser.name,
        color: generateCollaboratorColor(currentUser.id),
      };
    }

    const doJoin = () => socket.emit('join-note', joinPayload);
    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', doJoin);
    }

    return () => {
      setSessionId('');
      socket.off('session-info', handleSessionInfo);
      socket.off('note-snapshot', handleNoteSnapshot);
      socket.off('note-content', handleNoteContent);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('presence-list', handlePresenceList);
      socket.off('share-permission', handleSharePermission);
      socket.off('cursor-update', handleCursorUpdate);
      socket.off('connect', doJoin);
      socket.emit('leave-note', { noteId });
      onRemoteContentRef.current = null;
    };
  }, [noteId, currentUser?.id, shareToken]);

  /**
   * Call this every time the local user edits the note.
   * It broadcasts the current HTML content to all other users in the room.
   */
  const broadcastChange = useCallback((content: string, title: string) => {
    const activeId = activeNoteIdRef.current;
    if (!activeId) return;
    // Never broadcast blank editor state (mount / file-open race)
    if (isBlankHtml(content)) return;
    const socket = getSocket();
    socket.emit('note-change', { noteId: activeId, content, title });
  }, []);

  const broadcastCursor = useCallback((anchor: number, head: number) => {
    const activeId = activeNoteIdRef.current;
    if (!activeId) return;
    const socket = getSocket();
    socket.emit('cursor-update', { noteId: activeId, anchor, head });
  }, []);

  const isReadOnly = forceReadOnly || sharePermission === 'view';

  const effectiveSessionId = sessionId || currentUser?.id || '';

  return {
    collaborators,
    sharePermission,
    isReadOnly,
    sessionId: effectiveSessionId,
    setOnRemoteContent,
    broadcastChange,
    broadcastCursor,
  };
}
