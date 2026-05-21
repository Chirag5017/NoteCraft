import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector, selectConflicts } from '@/store';
import { clearConflicts, setSyncing, setOffline } from '@/store/uiSlice';
import { api, useUpdateNoteMutation } from '@/store/api';
import { db } from '@/lib/db';
import { formatFullDate } from '@/utils/formatDate';
import type { ConflictItem } from '@/types';
import { cn } from '@/utils/cn';

export function ConflictModal() {
  const dispatch = useAppDispatch();
  const conflicts = useAppSelector(selectConflicts);
  const [selections, setSelections] = useState<Record<string, 'local' | 'server'>>({});
  const [updateNote] = useUpdateNoteMutation();
  const [isResolving, setIsResolving] = useState(false);

  const isOpen = conflicts.length > 0;

  // Lock body scroll while open — and always restore on unmount/close
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Reset selections when new conflicts arrive
  useEffect(() => {
    setSelections({});
  }, [conflicts]);

  if (!isOpen) return null;

  const handleSelect = (noteId: string, version: 'local' | 'server') => {
    setSelections(prev => ({ ...prev, [noteId]: version }));
  };

  const allResolved = conflicts.length > 0 && conflicts.every(c => selections[c.noteId]);

  const resolveConflicts = async (choices: Record<string, 'local' | 'server'>) => {
    await Promise.all(
      conflicts.map(async (conflict: ConflictItem) => {
        const useLocal = choices[conflict.noteId] === 'local';
        const chosen = useLocal ? conflict.localVersion : conflict.serverVersion;
        const noteId = chosen.id ?? conflict.noteId;

        if (useLocal) {
          await updateNote({
            id: noteId,
            title: chosen.title,
            content: chosen.content,
          }).unwrap();
        }

        // Update IDB with the chosen version
        await db.notes.put({ ...chosen, id: noteId });
        dispatch(
          api.util.updateQueryData('getNote', noteId, draft => {
            Object.assign(draft, { ...chosen, id: noteId });
          })
        );
        window.dispatchEvent(
          new CustomEvent('notecraft:note-resolved', {
            detail: { note: { ...chosen, id: noteId } },
          })
        );

        // Clear this note from the sync queue
        const queueItems = await db.syncQueue
          .where('noteId')
          .equals(noteId)
          .toArray();
        await db.syncQueue.bulkDelete(queueItems.map(q => q.id!));
      })
    );

    dispatch(clearConflicts());
    dispatch(setSyncing(false));
    dispatch(setOffline(false));
    dispatch(api.util.invalidateTags(['Note']));
  };

  const handleDismiss = async () => {
    setIsResolving(true);
    try {
      const serverChoices = Object.fromEntries(
        conflicts.map(conflict => [conflict.noteId, 'server'])
      ) as Record<string, 'server'>;
      await resolveConflicts(serverChoices);
      toast.success('Kept server version');
    } catch {
      toast.error('Failed to keep server version — please try again');
    } finally {
      setIsResolving(false);
    }
  };

  const handleConfirm = async () => {
    if (!allResolved) return;
    setIsResolving(true);
    try {
      await resolveConflicts(selections);
      toast.success('Conflicts resolved');
    } catch {
      toast.error('Failed to resolve some conflicts — please try again');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    // Portal-style fixed overlay — rendered independently of Modal component
    // to avoid the body-overflow cleanup race condition
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop — clicking it does NOT dismiss (conflicts must be resolved) */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div className="relative w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 dark:border dark:border-gray-800 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4 shrink-0">
          <div>
            <h2 id="conflict-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Resolve {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Select which version to keep for each note
            </p>
          </div>
          <button
            onClick={handleDismiss}
            disabled={isResolving}
            aria-label="Keep server versions"
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {conflicts.map(conflict => (
            <div key={conflict.noteId} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                {conflict.localVersion?.title || conflict.serverVersion?.title || 'Untitled'}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Local version */}
                <button
                  type="button"
                  onClick={() => handleSelect(conflict.noteId, 'local')}
                  aria-pressed={selections[conflict.noteId] === 'local'}
                  className={cn(
                    'text-left p-3 rounded-xl border-2 transition-all duration-150',
                    selections[conflict.noteId] === 'local'
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mb-1">
                    Your version (local)
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mb-2">
                    {conflict.localVersion?.updatedAt
                      ? formatFullDate(conflict.localVersion.updatedAt)
                      : 'Unknown time'}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-5 font-mono leading-relaxed break-all">
                    {(conflict.localVersion?.content ?? '').slice(0, 300)}
                    {(conflict.localVersion?.content ?? '').length > 300 ? '…' : ''}
                  </p>
                </button>

                {/* Server version */}
                <button
                  type="button"
                  onClick={() => handleSelect(conflict.noteId, 'server')}
                  aria-pressed={selections[conflict.noteId] === 'server'}
                  className={cn(
                    'text-left p-3 rounded-xl border-2 transition-all duration-150',
                    selections[conflict.noteId] === 'server'
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1">
                    Server version
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mb-2">
                    {conflict.serverVersion?.updatedAt
                      ? formatFullDate(conflict.serverVersion.updatedAt)
                      : 'Unknown time'}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-5 font-mono leading-relaxed break-all">
                    {(conflict.serverVersion?.content ?? '').slice(0, 300)}
                    {(conflict.serverVersion?.content ?? '').length > 300 ? '…' : ''}
                  </p>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {Object.keys(selections).length}/{conflicts.length} selected
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDismiss} isLoading={isResolving}>
              Keep server
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              isLoading={isResolving}
              disabled={!allResolved || isResolving}
              aria-label="Confirm conflict resolution"
            >
              Confirm resolution
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
