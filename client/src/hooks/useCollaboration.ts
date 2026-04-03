import { useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { getOrCreateDoc, destroyDoc, generateCollaboratorColor } from '@/lib/yjs';
import { getSocket } from '@/lib/socket';
import { useAppSelector, selectUser } from '@/store';
import type { Collaborator } from '@/types';

export function useCollaboration(noteId: string) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const currentUser = useAppSelector(selectUser);

  const doc = getOrCreateDoc(noteId);

  const handleNoteUpdate = useCallback(
    (update: Uint8Array) => {
      Y.applyUpdate(doc, update);
    },
    [doc]
  );

  useEffect(() => {
    if (!currentUser) return;

    const socket = getSocket();

    // Broadcast local changes to peers
    const handleDocUpdate = (update: Uint8Array, origin: unknown) => {
      // Only broadcast updates that originated locally (not from socket)
      if (origin !== 'remote') {
        socket.emit('note-change', {
          noteId,
          update: Array.from(update),
        });
      }
    };

    doc.on('update', handleDocUpdate);

    // Handle incoming updates from peers
    const handleRemoteUpdate = (data: { noteId: string; update: number[] }) => {
      if (data.noteId === noteId) {
        Y.applyUpdate(doc, new Uint8Array(data.update), 'remote');
      }
    };

    // Handle collaborator presence
    const handleUserJoined = (collaborator: Collaborator) => {
      setCollaborators(prev => {
        const exists = prev.some(c => c.userId === collaborator.userId);
        if (exists) return prev;
        return [...prev, collaborator];
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setCollaborators(prev => prev.filter(c => c.userId !== data.userId));
    };

    socket.on('note-update', handleRemoteUpdate);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    // Announce presence
    const myColor = generateCollaboratorColor(currentUser.id);
    socket.emit('join-note', {
      noteId,
      user: {
        userId: currentUser.id,
        name: currentUser.name,
        color: myColor,
      },
    });

    return () => {
      doc.off('update', handleDocUpdate);
      socket.off('note-update', handleRemoteUpdate);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.emit('leave-note', { noteId });
      destroyDoc(noteId);
    };
  }, [noteId, doc, currentUser]);

  return { doc, collaborators, handleNoteUpdate };
}
