import { Avatar } from '@/components/ui/Avatar';
import type { Collaborator } from '@/types';

interface PresenceBarProps {
  collaborators: Collaborator[];
  maxVisible?: number;
}

export function PresenceBar({ collaborators, maxVisible = 5 }: PresenceBarProps) {
  if (collaborators.length === 0) return null;

  const visible = collaborators.slice(0, maxVisible);
  const overflow = collaborators.length - maxVisible;

  return (
    <div
      aria-label={`${collaborators.length} collaborator${collaborators.length !== 1 ? 's' : ''} active`}
      className="flex items-center gap-1"
    >
      <div className="flex -space-x-2">
        {visible.map(c => (
          <div key={c.userId} title={c.name} className="relative">
            <Avatar
              user={{ name: c.name }}
              size="sm"
              color={c.color}
              className="ring-2 ring-white dark:ring-gray-950"
            />
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-950 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300"
            aria-label={`${overflow} more collaborators`}
          >
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
        {collaborators.length} online
      </span>
    </div>
  );
}
