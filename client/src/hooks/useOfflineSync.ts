import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { db } from '@/lib/db';
import { useAppDispatch, useAppSelector, selectConflicts, selectToken } from '@/store';
import { setOffline, setSyncing, setConflicts } from '@/store/uiSlice';
import { useLazyGetNoteQuery } from '@/store/api';
import type { ConflictItem } from '@/types';

export function useOfflineSync() {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectToken);
  const conflicts = useAppSelector(selectConflicts);
  const [getNote] = useLazyGetNoteQuery();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const openConflictModalForPendingChanges = async () => {
      if (!token || isSyncingRef.current || conflicts.length > 0) return;

      isSyncingRef.current = true;

      // needsSync is stored as boolean true — use toArray + filter (not .equals(1))
      const allQueue = await db.syncQueue.toArray();
      const pending = allQueue.filter(p => p.needsSync === true);

      if (pending.length === 0) {
        dispatch(setOffline(false));
        isSyncingRef.current = false;
        return;
      }

      const noteIds = [...new Set(pending.map(p => p.noteId))];
      const noteResults = await db.notes.bulkGet(noteIds);
      const validNotes = noteResults.filter((n): n is NonNullable<typeof n> => n != null);

      if (validNotes.length === 0) {
        // Nothing valid to sync — clear the queue and go online
        await db.syncQueue.clear();
        dispatch(setOffline(false));
        isSyncingRef.current = false;
        return;
      }

      dispatch(setSyncing(true));

      try {
        const pendingConflicts = (
          await Promise.all(
            validNotes.map(async localVersion => {
              try {
                const serverVersion = await getNote(localVersion.id, false).unwrap();
                return {
                  noteId: localVersion.id,
                  localVersion,
                  serverVersion,
                };
              } catch {
                return null;
              }
            })
          )
        ).filter((item): item is ConflictItem => item != null);

        if (pendingConflicts.length > 0) {
          dispatch(setConflicts(pendingConflicts));
          dispatch(setOffline(true));
          toast('Choose which version to keep before syncing', { icon: '⚠️', duration: 6000 });
        } else {
          // New offline-only notes do not have a server copy to compare yet.
          // Keep them queued so the next reconnect/startup can try again.
          dispatch(setSyncing(false));
          dispatch(setOffline(false));
        }
      } catch (err) {
        dispatch(setSyncing(false));
        toast.error('Could not load server versions — will retry on next reconnect');
      } finally {
        isSyncingRef.current = false;
      }
    };

    const handleOnline = () => {
      void openConflictModalForPendingChanges();
    };

    const handleOffline = () => {
      dispatch(setOffline(true));
    };

    // Check initial state — user might already be offline when hook mounts
    if (!navigator.onLine) {
      dispatch(setOffline(true));
    } else {
      void openConflictModalForPendingChanges();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [conflicts.length, dispatch, getNote, token]);
}
