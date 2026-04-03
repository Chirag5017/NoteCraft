import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Users, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLayout } from '@/components/layout/PageLayout';
import { WorkspaceList } from '@/components/workspace/WorkspaceList';
import { FolderTree } from '@/components/folder/FolderTree';
import { MembersModal } from '@/components/workspace/MembersModal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useGetWorkspacesQuery, useGetFoldersQuery, useGetNotesQuery, useCreateNoteMutation } from '@/store/api';
import { useAppDispatch, useAppSelector, selectUser } from '@/store';
import { setFolders } from '@/store/folderSlice';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function WorkspacePage() {
  const { id: workspaceId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  const { data: workspaces } = useGetWorkspacesQuery();
  const workspace = workspaces?.find(w => w.id === workspaceId);
  const isOwner = workspace?.ownerId === currentUser?.id;

  const { data: folders, isLoading: foldersLoading } = useGetFoldersQuery(workspaceId, {
    skip: !workspaceId,
  });

  const { data: notes, isLoading: notesLoading } = useGetNotesQuery(
    { workspaceId },
    { skip: !workspaceId }
  );

  const [createNote, { isLoading: isCreating }] = useCreateNoteMutation();

  useEffect(() => {
    if (folders) dispatch(setFolders(folders));
  }, [folders, dispatch]);

  const handleNewNote = async () => {
    try {
      const note = await createNote({
        title: 'Untitled',
        workspaceId,
        folderId: null,
      }).unwrap();
      navigate(`/workspace/${workspaceId}/note/${note.id}`);
    } catch {
      toast.error('Failed to create note');
    }
  };

  const WorkspaceSidebar = (
    <div className="flex flex-col h-full">
      <WorkspaceList />
    </div>
  );

  return (
    <PageLayout sidebar={WorkspaceSidebar}>
      <div className="flex h-full page-transition">
        {/* Folder panel */}
        <div className="w-72 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          {/* Workspace header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            {workspace ? (
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {workspace.name}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMembersOpen(true)}
                    aria-label="Share workspace"
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleNewNote}
                    isLoading={isCreating}
                    leftIcon={<Plus className="h-4 w-4" />}
                    aria-label="New note"
                  >
                    Note
                  </Button>
                </div>
              </div>
            ) : (
              <Skeleton className="h-5 w-32" />
            )}
          </div>

          <FolderTree
            workspaceId={workspaceId}
            folders={folders ?? []}
            notes={notes ?? []}
            isLoading={foldersLoading || notesLoading}
          />
        </div>

        {/* Main panel */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Select a note to start editing
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-600 mb-4">
              Or create a new note to get started
            </p>
            <Button
              onClick={handleNewNote}
              isLoading={isCreating}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              New Note
            </Button>
          </div>
        </div>
      </div>

      {/* Members modal */}
      {workspace && (
        <MembersModal
          isOpen={isMembersOpen}
          onClose={() => setIsMembersOpen(false)}
          workspace={workspace}
          isOwner={isOwner}
        />
      )}
    </PageLayout>
  );
}
