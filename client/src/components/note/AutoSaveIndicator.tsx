import { Check, Loader2, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SaveStatus } from '@/types';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
}

const statusConfig = {
  saved: {
    icon: <Check className="h-3.5 w-3.5" />,
    label: 'Saved',
    className: 'text-green-600 dark:text-green-400',
  },
  saving: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    label: 'Saving...',
    className: 'text-gray-500 dark:text-gray-400',
  },
  offline: {
    icon: <WifiOff className="h-3.5 w-3.5" />,
    label: 'Offline',
    className: 'text-yellow-600 dark:text-yellow-400',
  },
  error: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    label: 'Error',
    className: 'text-red-600 dark:text-red-400',
  },
};

export function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div
      aria-live="polite"
      aria-label={`Save status: ${config.label}`}
      className={cn('flex items-center gap-1.5 text-xs font-medium', config.className)}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}
