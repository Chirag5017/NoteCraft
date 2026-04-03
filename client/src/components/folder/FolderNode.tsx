import { ChevronRight, ChevronDown, Folder, FileText, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import type { Folder as FolderType, Note, FolderTreeNode } from '@/types';

interface FolderNodeProps {
  node: FolderTreeNode;
  notes: Note[];
  depth: number;
  isExpanded: boolean;
  activeNoteId: string | null;
  workspaceId: string;
  onToggle: (folderId: string) => void;
  onFolderContextMenu: (e: React.MouseEvent, folder: FolderType) => void;
  onDeleteNote: (noteId: string) => void;
}

export function FolderNode({
  node,
  notes,
  depth,
  isExpanded,
  activeNoteId,
  workspaceId,
  onToggle,
  onFolderContextMenu,
  onDeleteNote,
}: FolderNodeProps) {
  const navigate = useNavigate();
  const folderNotes = notes.filter(n => n.folderId === node.id);
  const hasChildren = node.children.length > 0 || folderNotes.length > 0;
  const indent = depth * 12 + 8;

  return (
    <div>
      {/* Folder row */}
      <div
        className="group flex items-center gap-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mx-1"
        style={{ paddingLeft: `${indent}px` }}
        onContextMenu={e => onFolderContextMenu(e, node)}
      >
        <button
          onClick={() => onToggle(node.id)}
          aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          aria-expanded={isExpanded}
          className="flex items-center gap-1.5 flex-1 py-1.5 pr-1 text-sm text-gray-700 dark:text-gray-300 min-w-0"
        >
          <span className="shrink-0 text-gray-400">
            {hasChildren
              ? isExpanded
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronRight className="h-3.5 w-3.5" />
              : <span className="w-3.5 inline-block" />
            }
          </span>
          <Folder className="h-4 w-4 shrink-0 text-yellow-500" />
          <span className="truncate font-medium">{node.name}</span>
          {folderNotes.length > 0 && (
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-600 shrink-0 pr-1">
              {folderNotes.length}
            </span>
          )}
        </button>
        <button
          onClick={e => onFolderContextMenu(e, node)}
          aria-label={`Options for ${node.name}`}
          className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Children */}
      {isExpanded && (
        <div>
          {/* Sub-folders */}
          {node.children.map(child => (
            <FolderNode
              key={child.id}
              node={child}
              notes={notes}
              depth={depth + 1}
              isExpanded={false}
              activeNoteId={activeNoteId}
              workspaceId={workspaceId}
              onToggle={onToggle}
              onFolderContextMenu={onFolderContextMenu}
              onDeleteNote={onDeleteNote}
            />
          ))}

          {/* Notes in this folder */}
          {folderNotes.length === 0 && node.children.length === 0 && (
            <div
              className="text-xs text-gray-400 dark:text-gray-600 py-1"
              style={{ paddingLeft: `${indent + 24}px` }}
            >
              Empty folder
            </div>
          )}
          {folderNotes.map(note => (
            <div
              key={note.id}
              className="group flex items-center gap-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mx-1"
              style={{ paddingLeft: `${indent + 12}px` }}
            >
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/note/${note.id}`)}
                aria-label={`Open note ${note.title}`}
                aria-current={note.id === activeNoteId ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-1.5 flex-1 py-1.5 text-sm min-w-0',
                  note.id === activeNoteId
                    ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <span className="w-3.5 inline-block shrink-0" />
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{note.title || 'Untitled'}</span>
              </button>
              <button
                onClick={() => onDeleteNote(note.id)}
                aria-label={`Delete ${note.title}`}
                title="Delete note"
                className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded text-gray-400 hover:text-red-500 transition-all text-base leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
