import { BookOpen } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { WorkspaceList } from '@/components/workspace/WorkspaceList';
import { NoteCard } from '@/components/note/NoteCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useGetWorkspacesQuery, useGetNotesQuery } from '@/store/api';
import { useAppSelector, selectUser } from '@/store';

function RecentNotes() {
  const { data: workspaces } = useGetWorkspacesQuery();
  const firstWorkspaceId = workspaces?.[0]?.id ?? '';

  const { data: notes, isLoading } = useGetNotesQuery(
    { workspaceId: firstWorkspaceId },
    { skip: !firstWorkspaceId }
  );

  const recentNotes = notes
    ?.slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!recentNotes?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="h-16 w-16 text-gray-200 dark:text-gray-800 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No notes yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Open a workspace and create your first note to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {recentNotes.map(note => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}

export function DashboardPage() {
  const user = useAppSelector(selectUser);

  return (
    <PageLayout sidebar={<WorkspaceList />}>
      <div className="p-8 page-transition">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Here are your recent notes
          </p>
        </div>

        {/* Recent notes */}
        <RecentNotes />
      </div>
    </PageLayout>
  );
}
