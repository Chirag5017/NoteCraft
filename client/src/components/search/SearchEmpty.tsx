import { Search } from 'lucide-react';

interface SearchEmptyProps {
  query: string;
}

export function SearchEmpty({ query }: SearchEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Search className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
        No results for "{query}"
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
        Try a different search term
      </p>
    </div>
  );
}
