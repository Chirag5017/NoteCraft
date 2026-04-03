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
      // Get all pending sync items — needsSync is boolean true
      const allQueue = await db.syncQueue.toArray();
      const pending = allQueue.filter(p => p.needsSync === true);

      if (pending.length === 0) {
        dispatch(setOffline(false));
        return;
      }

      const noteIds = [...new Set(pending.map(p => p.noteId))];
      const notes = await db.notes.bulkGet(noteIds);
      const validNotes = notes.filter((n): n is NonNullable<typeof n> => n != null);

      dispatch(setSyncing(true));
      const toastId = toast.loading('Syncing...');

      try {
        const result = await syncNotes({ notes: validNotes }).unwrap();

        if (result.conflicts.length > 0) {
          dispatch(setConflicts(result.conflicts));
          toast.dismiss(toastId);
          toast('Conflicts found — please resolve them', { icon: '⚠️' });
        } else {
          await db.syncQueue.clear();
          dispatch(setSyncing(false));
          dispatch(setOffline(false));
          toast.success('Synced', { id: toastId });
        }
      } catch {
        dispatch(setSyncing(false));
        toast.error('Sync failed — will retry on next reconnect', { id: toastId });
      }
    };

    const handleOffline = () => {
      dispatch(setOffline(true));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch, syncNotes]);
}
