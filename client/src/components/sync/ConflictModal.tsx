import { useState } from 'react';
import toast from "react-hot-toast";
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector, selectConflicts } from '@/store';
import { clearConflicts, setSyncing, setOffline } from '@/store/uiSlice';
import { useUpdateNoteMutation } from '@/store/api';
import { db } from '@/lib/db';
import { formatFullDate } from '@/utils/formatDate';
import type { ConflictItem } from '@/types';

export function ConflictModal() {
  const dispatch = useAppDispatch();
  const conflicts = useAppSelector(selectConflicts);
  const [selections, setSelections] = useState<Record<string, 'local' | 'server'>>({});
  const [updateNote] = useUpdateNoteMutation();
  const [isResolving, setIsResolving] = useState(false);

  const isOpen = conflicts.length > 0;

  const handleSelect = (noteId: string, version: 'local' | 'server') => {
    setSelections(prev => ({ ...prev, [noteId]: version }));
  };

  const allResolved = conflicts.every(c => selections[c.noteId]);

  const handleConfirm = async () => {
    setIsResolving(true);
    try {
      await Promise.all(
        conflicts.map(async (conflict: ConflictItem) => {
          const chosen =
            selections[conflict.noteId] === 'local'
              ? conflict.localVersion
              : conflict.serverVersion;

          // Save to API
          await updateNote({
            id: chosen.id,
            title: chosen.title,
            content: chosen.content,
          }).unwrap();

          // Save to IDB
          await db.notes.put(chosen);
          await db.syncQueue
            .where('noteId')
            .equals(chosen.id)
            .delete();
        })
      );

      dispatch(clearConflicts());
      dispatch(setSyncing(false));
      dispatch(setOffline(false));
      toast.success('Conflicts resolved');
    } catch {
      toast.error('Failed to resolve conflicts');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Cannot close without resolving
      title={`Resolve ${conflicts.length} Conflict${conflicts.length !== 1 ? 's' : ''}`}
      size="xl"
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The following notes have conflicting changes. Select which version to keep for each note.
        </p>

        <div className="space-y-6 max-h-96 overflow-y-auto">
          {conflicts.map(conflict => (
            <div key={conflict.noteId} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {conflict.localVersion.title || 'Untitled'}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Local version */}
                <button
                  onClick={() => handleSelect(conflict.noteId, 'local')}
                  aria-pressed={selections[conflict.noteId] === 'local'}
                  className={`text-left p-3 rounded-lg border-2 transition-colors ${
                    selections[conflict.noteId] === 'local'
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Your version
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mb-2">
                    {formatFullDate(conflict.localVersion.updatedAt)}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4 font-mono text-xs">
                    {conflict.localVersion.content.slice(0, 200)}...
                  </p>
                </button>

                {/* Server version */}
                <button
                  onClick={() => handleSelect(conflict.noteId, 'server')}
                  aria-pressed={selections[conflict.noteId] === 'server'}
                  className={`text-left p-3 rounded-lg border-2 transition-colors ${
                    selections[conflict.noteId] === 'server'
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Server version
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mb-2">
                    {formatFullDate(conflict.serverVersion.updatedAt)}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4 font-mono text-xs">
                    {conflict.serverVersion.content.slice(0, 200)}...
                  </p>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          <Button
            onClick={handleConfirm}
            isLoading={isResolving}
            disabled={!allResolved}
          >
            Confirm resolution
          </Button>
        </div>
      </div>
    </Modal>
  );
}
