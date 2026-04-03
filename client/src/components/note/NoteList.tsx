import { FileText } from 'lucide-react';
import { NoteCard } from './NoteCard';
import type { Note } from '@/types';

interface NoteListProps {
  notes: Note[];
  isLoading?: boolean;
  activeNoteId?: string | null;
}

export function NoteList({ notes, isLoading, activeNoteId }: NoteListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <NoteCard key={i} skeleton />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <FileText className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          No notes yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
          Create a note to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 p-4">
      {notes.map(note => (
        <NoteCard key={note.id} note={note} isActive={note.id === activeNoteId} />
      ))}
    </div>
  );
}
