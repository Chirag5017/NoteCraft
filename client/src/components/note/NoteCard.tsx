import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatDate } from '@/utils/formatDate';
import { truncate } from '@/utils/truncate';
import { cn } from '@/utils/cn';
import type { Note } from '@/types';

interface NoteCardProps {
  note: Note;
  isActive?: boolean;
}

interface NoteCardSkeletonProps {
  skeleton: true;
}

export function NoteCard(props: NoteCardProps | NoteCardSkeletonProps) {
  const navigate = useNavigate();

  if ('skeleton' in props) {
    return <SkeletonCard />;
  }

  const { note, isActive } = props;

  // Extract plain text from HTML content for snippet
  let snippet = '';
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = note.content || '';
    snippet = tmp.textContent || tmp.innerText || '';
  } catch {
    snippet = '';
  }

  return (
    <button
      onClick={() => navigate(`/workspace/${note.workspaceId}/note/${note.id}`)}
      aria-label={`Open note: ${note.title || 'Untitled'}`}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all duration-150',
        'hover:shadow-md hover:-translate-y-0.5',
        isActive
          ? 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
      )}
    >
      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 text-gray-400 dark:text-gray-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {note.title || 'Untitled'}
          </h3>
          {snippet && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {truncate(snippet, 120)}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
            {formatDate(note.updatedAt)}
          </p>
        </div>
      </div>
    </button>
  );
}
