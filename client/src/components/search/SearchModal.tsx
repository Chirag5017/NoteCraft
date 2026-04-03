import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchResult } from './SearchResult';
import { SearchEmpty } from './SearchEmpty';
import { Spinner } from '@/components/ui/Spinner';
import { useAppDispatch, useAppSelector, selectIsSearchOpen } from '@/store';
import { setSearchOpen } from '@/store/uiSlice';
import { useSearch } from '@/hooks/useSearch';
import { cn } from '@/utils/cn';

export function SearchModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsSearchOpen);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { query, setQuery, results, isFetching, hasQuery } = useSearch();

  const close = () => {
    dispatch(setSearchOpen(false));
    setQuery('');
    setSelectedIndex(0);
  };

  // Cmd+K global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dispatch(setSearchOpen(true));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      const r = results[selectedIndex];
      navigate(`/workspace/${r.workspaceId}/note/${r.noteId}`);
      close();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search notes"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={close}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full max-w-xl rounded-xl shadow-2xl overflow-hidden',
          'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
          'animate-fade-in'
        )}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <Search className="h-5 w-5 text-gray-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search notes..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            aria-label="Search query"
            aria-autocomplete="list"
            aria-controls="search-results"
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 text-sm focus:outline-none"
          />
          {isFetching && <Spinner size="sm" className="text-gray-400" />}
          <button
            onClick={close}
            aria-label="Close search"
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div
          id="search-results"
          role="listbox"
          aria-label="Search results"
          className="max-h-80 overflow-y-auto"
        >
          {hasQuery && !isFetching && results.length === 0 && (
            <SearchEmpty query={query} />
          )}

          {results.map((result, i) => (
            <SearchResult
              key={result.noteId}
              result={result}
              isSelected={i === selectedIndex}
              onSelect={() => {
                navigate(`/workspace/${result.workspaceId}/note/${result.noteId}`);
                close();
              }}
            />
          ))}
        </div>

        {/* Footer hint */}
        {!hasQuery && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-600">
              Type at least 2 characters to search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
