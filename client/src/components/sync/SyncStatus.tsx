import { RefreshCw } from 'lucide-react';
import { useAppSelector, selectIsSyncing } from '@/store';

export function SyncStatus() {
  const isSyncing = useAppSelector(selectIsSyncing);

  if (!isSyncing) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Sync status"
      className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400"
    >
      <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      <span>Syncing...</span>
    </div>
  );
}
