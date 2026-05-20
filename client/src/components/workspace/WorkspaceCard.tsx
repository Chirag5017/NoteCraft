import { FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useAppSelector, selectUser } from '@/store';
import { cn } from '@/utils/cn';
import type { Workspace } from '@/types';

interface WorkspaceCardProps {
  workspace: Workspace;
  isActive?: boolean;
  onClick?: () => void;
}

export function WorkspaceCard({ workspace, isActive, onClick }: WorkspaceCardProps) {
  const currentUser = useAppSelector(selectUser);
  const isOwner = currentUser?.id === workspace.ownerId;

  return (
    <button
      onClick={onClick}
      aria-label={`Open workspace ${workspace.name}`}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
        'transition-colors duration-150',
        isActive
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      )}
    >
      <FolderOpen className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate text-sm font-medium">{workspace.name}</span>
      <Badge variant={isOwner ? 'owner' : 'member'}>
        {isOwner ? 'Owner' : 'Member'}
      </Badge>
    </button>
  );
}
