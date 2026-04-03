import { WifiOff, RefreshCw } from 'lucide-react';
import { useAppSelector, selectIsOffline, selectIsSyncing } from '@/store';
import { cn } from '@/utils/cn';

export function OfflineBanner() {
  const isOffline = useAppSelector(selectIsOffline);
  const isSyncing = useAppSelector(selectIsSyncing);

  if (!isOffline && !isSyncing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium',
        'transition-colors duration-300',
        isSyncing
          ? 'bg-blue-500 text-white'
          : 'bg-yellow-500 text-white'
      )}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          Syncing your changes...
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          You're offline. Changes will sync when you reconnect.
        </>
      )}
    </div>
  );
}
