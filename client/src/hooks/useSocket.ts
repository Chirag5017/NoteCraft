import { useEffect, useCallback } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { useAppDispatch, useAppSelector, selectToken, selectIsAuthenticated } from '@/store';
import { setOffline } from '@/store/uiSlice';
import type { Collaborator } from '@/types';

interface UseSocketOptions {
  noteId?: string;
  onNoteUpdate?: (update: Uint8Array) => void;
  onUserJoined?: (collaborator: Collaborator) => void;
  onUserLeft?: (userId: string) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectToken);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { noteId, onNoteUpdate, onUserJoined, onUserLeft } = options;

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    connectSocket(token);

    const socket = getSocket();

    const handleConnect = () => dispatch(setOffline(false));
    const handleDisconnect = () => dispatch(setOffline(true));

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated, token, dispatch]);

  // Note-specific events
  useEffect(() => {
    if (!noteId) return;
    const socket = getSocket();

    socket.emit('join-note', { noteId });

    const handleNoteUpdate = (data: { noteId: string; update: number[] }) => {
      if (data.noteId === noteId && onNoteUpdate) {
        onNoteUpdate(new Uint8Array(data.update));
      }
    };

    const handleUserJoined = (collaborator: Collaborator) => {
      onUserJoined?.(collaborator);
    };

    const handleUserLeft = (data: { userId: string }) => {
      onUserLeft?.(data.userId);
    };

    socket.on('note-update', handleNoteUpdate);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.emit('leave-note', { noteId });
      socket.off('note-update', handleNoteUpdate);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [noteId, onNoteUpdate, onUserJoined, onUserLeft]);

  const emitNoteChange = useCallback(
    (update: Uint8Array) => {
      if (!noteId) return;
      const socket = getSocket();
      socket.emit('note-change', { noteId, update: Array.from(update) });
    },
    [noteId]
  );

  return { emitNoteChange, disconnect: disconnectSocket };
}
