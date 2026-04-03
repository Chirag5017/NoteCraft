import { useState } from 'react';
import { Plus, FolderPlus, FileText, FilePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FolderNode } from './FolderNode';
import { FolderContextMenu } from './FolderContextMenu';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useAppDispatch, useAppSelector, selectExpandedFolderIds, selectActiveNoteId } from '@/store';
import { toggleFolderExpanded, addFolder, removeFolder, renameFolder } from '@/store/folderSlice';
import {
  useCreateFolderMutation,
  useDeleteFolderMutation,
  useCreateNoteMutation,
  useDeleteNoteMutation,
} from '@/store/api';
import type { Folder, Note, FolderTreeNode } from '@/types';

interface FolderTreeProps {
  workspaceId: string;
  folders: Folder[];
  notes: Note[];
  isLoading?: boolean;
}

function buildFolderTree(folders: Folder[], parentId: string | null = null): FolderTreeNode[] {
  return folders
    .filter(f => f.parentFolderId === parentId)
    .map(f => ({ ...f, children: buildFolderTree(folders, f.id) }));
}

interface ContextMenuState {
  folder: Folder;
  position: { x: number; y: number };
}

export function FolderTree({ workspaceId, folders, notes, isLoading }: FolderTreeProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const expandedIds = useAppSelector(selectExpandedFolderIds);
  const activeNoteId = useAppSelector(selectActiveNoteId);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [createFolder, { isLoading: isCreatingFolder }] = useCreateFolderMutation();
  const [deleteFolder] = useDeleteFolderMutation();
  const [createNote] = useCreateNoteMutation();
  const [deleteNote] = useDeleteNoteMutation();

  const tree = buildFolderTree(folders);
  // Root-level notes (no folder)
  const rootNotes = notes.filter(n => !n.folderId);

  const handleFolderContextMenu = (e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    setContextMenu({ folder, position: { x: e.clientX, y: e.clientY } });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const folder = await createFolder({
        name: newFolderName.trim(),
        workspaceId,
        parentFolderId,
      }).unwrap();
      dispatch(addFolder(folder));
      if (parentFolderId) dispatch(toggleFolderExpanded(parentFolderId));
      setIsNewFolderOpen(false);
      setNewFolderName('');
      setParentFolderId(null);
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    try {
      await deleteFolder(folder.id).unwrap();
      dispatch(removeFolder(folder.id));
      toast.success('Folder deleted');
    } catch {
      toast.error('Failed to delete folder');
    }
  };

  const handleRenameFolder = (folder: Folder) => {
    setRenamingFolder(folder);
    setRenameValue(folder.name);
    setIsRenameOpen(true);
  };

  const handleRenameSubmit = () => {
    if (!renamingFolder || !renameValue.trim()) return;
    dispatch(renameFolder({ id: renamingFolder.id, name: renameValue.trim() }));
    setIsRenameOpen(false);
    setRenamingFolder(null);
  };

  const handleAddSubfolder = (folder: Folder) => {
    setParentFolderId(folder.id);
    setIsNewFolderOpen(true);
  };

  // Create note inside a specific folder
  const handleAddNoteInFolder = async (folder: Folder) => {
    try {
      const note = await createNote({
        title: 'Untitled',
        workspaceId,
        folderId: folder.id,
      }).unwrap();
      dispatch(toggleFolderExpanded(folder.id));
      navigate(`/workspace/${workspaceId}/note/${note.id}`);
    } catch {
      toast.error('Failed to create note');
    }
  };

  // Delete a note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId).unwrap();
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Files
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setParentFolderId(null); setIsNewFolderOpen(true); }}
            aria-label="New folder"
            title="New folder"
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
          <button
            onClick={async () => {
              try {
                const note = await createNote({ title: 'Untitled', workspaceId, folderId: null }).unwrap();
                navigate(`/workspace/${workspaceId}/note/${note.id}`);
              } catch {
                toast.error('Failed to create note');
              }
            }}
            aria-label="New note"
            title="New note"
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <FilePlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && <SkeletonList count={5} />}

        {!isLoading && tree.length === 0 && rootNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <FolderPlus className="h-8 w-8 text-gray-300 dark:text-gray-700 mb-2" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              No files yet
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setParentFolderId(null); setIsNewFolderOpen(true); }}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus className="h-3 w-3" /> Folder
              </button>
              <button
                onClick={async () => {
                  try {
                    const note = await createNote({ title: 'Untitled', workspaceId, folderId: null }).unwrap();
                    navigate(`/workspace/${workspaceId}/note/${note.id}`);
                  } catch {
                    toast.error('Failed to create note');
                  }
                }}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <Plus className="h-3 w-3" /> Note
              </button>
            </div>
          </div>
        )}

        {/* Folders */}
        {tree.map(node => (
          <FolderNode
            key={node.id}
            node={node}
            notes={notes}
            depth={0}
            isExpanded={expandedIds.includes(node.id)}
            activeNoteId={activeNoteId}
            workspaceId={workspaceId}
            onToggle={id => dispatch(toggleFolderExpanded(id))}
            onFolderContextMenu={handleFolderContextMenu}
            onDeleteNote={handleDeleteNote}
          />
        ))}

        {/* Root-level notes (no folder) */}
        {rootNotes.length > 0 && (
          <div className="mt-1">
            {tree.length > 0 && (
              <div className="px-3 py-1">
                <span className="text-xs text-gray-400 dark:text-gray-600 uppercase tracking-wider">Loose files</span>
              </div>
            )}
            {rootNotes.map(note => (
              <div
                key={note.id}
                className="group flex items-center gap-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mx-1"
              >
                <button
                  onClick={() => navigate(`/workspace/${workspaceId}/note/${note.id}`)}
                  aria-label={`Open ${note.title || 'Untitled'}`}
                  aria-current={note.id === activeNoteId ? 'page' : undefined}
                  className={`flex items-center gap-2 flex-1 px-3 py-1.5 text-sm min-w-0 rounded-lg ${
                    note.id === activeNoteId
                      ? 'text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/20'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="truncate">{note.title || 'Untitled'}</span>
                </button>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  aria-label={`Delete ${note.title}`}
                  className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded text-gray-400 hover:text-red-500 transition-all"
                  title="Delete note"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Folder context menu */}
      {contextMenu && (
        <FolderContextMenu
          folder={contextMenu.folder}
          position={contextMenu.position}
          onRename={handleRenameFolder}
          onDelete={handleDeleteFolder}
          onAddSubfolder={handleAddSubfolder}
          onAddNote={handleAddNoteInFolder}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* New folder modal */}
      <Modal
        isOpen={isNewFolderOpen}
        onClose={() => { setIsNewFolderOpen(false); setNewFolderName(''); setParentFolderId(null); }}
        title={parentFolderId ? 'New Subfolder' : 'New Folder'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Folder name"
            placeholder="My Folder"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); }}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setIsNewFolderOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateFolder} isLoading={isCreatingFolder} disabled={!newFolderName.trim()}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        title="Rename Folder"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Folder name"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); }}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setIsRenameOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleRenameSubmit} disabled={!renameValue.trim()}>Rename</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
