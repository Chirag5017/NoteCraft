import { useState } from 'react';
import { Plus, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { WorkspaceCard } from './WorkspaceCard';
import { useGetWorkspacesQuery, useCreateWorkspaceMutation } from '@/store/api';
import { useAppDispatch, useAppSelector, selectActiveWorkspaceId } from '@/store';
import { setActiveWorkspace } from '@/store/workspaceSlice';

export function WorkspaceList() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const activeId = useAppSelector(selectActiveWorkspaceId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: workspaces, isLoading, isError } = useGetWorkspacesQuery();
  const [createWorkspace, { isLoading: isCreating }] = useCreateWorkspaceMutation();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const ws = await createWorkspace({ name: newName.trim() }).unwrap();
      setIsModalOpen(false);
      setNewName('');
      dispatch(setActiveWorkspace(ws.id));
      navigate(`/workspace/${ws.id}`);
    } catch {
      toast.error('Failed to create workspace');
    }
  };

  const handleSelect = (id: string) => {
    dispatch(setActiveWorkspace(id));
    navigate(`/workspace/${id}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Workspaces
        </span>
        <button
          onClick={() => setIsModalOpen(true)}
          aria-label="New workspace"
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && <SkeletonList count={4} />}

        {isError && (
          <p className="text-xs text-red-500 px-3 py-2">Failed to load workspaces</p>
        )}

        {!isLoading && !isError && workspaces?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <FolderPlus className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              No workspaces yet
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsModalOpen(true)}
            >
              Create one
            </Button>
          </div>
        )}

        {workspaces?.map(ws => (
          <WorkspaceCard
            key={ws.id}
            workspace={ws}
            isActive={ws.id === activeId}
            onClick={() => handleSelect(ws.id)}
          />
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setNewName(''); }}
        title="New Workspace"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Workspace name"
            placeholder="My Workspace"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setIsModalOpen(false); setNewName(''); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              isLoading={isCreating}
              disabled={!newName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
