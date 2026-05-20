import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { db } from '@/lib/db';
import { useAppDispatch } from '@/store';
import { setOffline, setSyncing, setConflicts } from '@/store/uiSlice';
import { useSyncNotesMutation } from '@/store/api';

export function useOfflineSync() {
  const dispatch = useAppDispatch();
  const [syncNotes] = useSyncNotesMutation();

  useEffect(() => {
    const handleOnline = async () => {
      // needsSync is stored as boolean true — use toArray + filter (not .equals(1))
      const allQueue = await db.syncQueue.toArray();
      const pending = allQueue.filter(p => p.needsSync === true);

      if (pending.length === 0) {
        dispatch(setOffline(false));
        return;
      }

      const noteIds = [...new Set(pending.map(p => p.noteId))];
      const noteResults = await db.notes.bulkGet(noteIds);
      const validNotes = noteResults.filter((n): n is NonNullable<typeof n> => n != null);

      if (validNotes.length === 0) {
        // Nothing valid to sync — clear the queue and go online
        await db.syncQueue.clear();
        dispatch(setOffline(false));
        return;
      }

      dispatch(setSyncing(true));
      const toastId = toast.loading('Syncing your changes...');

      try {
        const result = await syncNotes({ notes: validNotes }).unwrap();

        // Always clear synced items from the queue
        await db.syncQueue.clear();

        if (result.conflicts && result.conflicts.length > 0) {
          dispatch(setConflicts(result.conflicts));
          // Keep isSyncing=true and isOffline=true until conflicts are resolved
          toast.dismiss(toastId);
          toast('Conflicts found — please resolve them', { icon: '⚠️', duration: 6000 });
        } else {
          dispatch(setSyncing(false));
          dispatch(setOffline(false));
          toast.success(`${validNotes.length} note${validNotes.length !== 1 ? 's' : ''} synced`, { id: toastId });
        }
      } catch (err) {
        dispatch(setSyncing(false));
        toast.error('Sync failed — will retry on next reconnect', { id: toastId });
      }
    };

    const handleOffline = () => {
      dispatch(setOffline(true));
    };

    // Check initial state — user might already be offline when hook mounts
    if (!navigator.onLine) {
      dispatch(setOffline(true));
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch, syncNotes]);
}
