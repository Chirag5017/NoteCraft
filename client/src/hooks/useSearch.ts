import { useState } from 'react';
import { useDebounce } from './useDebounce';
import { useSearchNotesQuery } from '@/store/api';

export function useSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isFetching, isError } = useSearchNotesQuery(debouncedQuery, {
    skip: debouncedQuery.trim().length < 2,
  });

  return {
    query,
    setQuery,
    results: results ?? [],
    isFetching,
    isError,
    hasQuery: debouncedQuery.trim().length >= 2,
  };
}
