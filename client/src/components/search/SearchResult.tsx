import { FileText, FolderOpen } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SearchResult as SearchResultType } from '@/types';

interface SearchResultProps {
  result: SearchResultType;
  isSelected?: boolean;
  onSelect: () => void;
}

function HighlightedText({
  text,
  highlights,
}: {
  text: string;
  highlights: Array<{ start: number; end: number }>;
}) {
  if (!highlights.length) return <span>{text}</span>;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  const sorted = [...highlights].sort((a, b) => a.start - b.start);

  sorted.forEach(({ start, end }, i) => {
    if (start > lastIndex) {
      parts.push(<span key={`text-${i}`}>{text.slice(lastIndex, start)}</span>);
    }
    parts.push(
      <mark
        key={`mark-${i}`}
        className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-gray-100 rounded-sm"
      >
        {text.slice(start, end)}
      </mark>
    );
    lastIndex = end;
  });

  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

export function SearchResult({ result, isSelected, onSelect }: SearchResultProps) {
  return (
    <button
      onClick={onSelect}
      aria-selected={isSelected}
      className={cn(
        'w-full text-left px-4 py-3 transition-colors',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        isSelected && 'bg-brand-50 dark:bg-brand-900/20'
      )}
    >
      <div className="flex items-start gap-3">
        <FileText className="h-4 w-4 text-gray-400 dark:text-gray-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {result.noteTitle}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <FolderOpen className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {result.workspaceName}
              {result.folderName && ` / ${result.folderName}`}
            </span>
          </div>
          {result.snippet && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              <HighlightedText text={result.snippet} highlights={result.highlights} />
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
