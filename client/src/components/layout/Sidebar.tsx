import { useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useAppDispatch, useAppSelector, selectIsSidebarCollapsed } from '@/store';
import { toggleSidebar } from '@/store/uiSlice';

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const dispatch = useAppDispatch();
  const isCollapsed = useAppSelector(selectIsSidebarCollapsed);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        dispatch(toggleSidebar());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  return (
    <aside
      aria-label="Sidebar navigation"
      className={cn(
        'flex flex-col h-full bg-gray-50 dark:bg-gray-900',
        'border-r border-gray-200 dark:border-gray-800',
        'transition-all duration-200 overflow-hidden',
        isCollapsed ? 'w-0' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full w-64 overflow-y-auto">
        {children}
      </div>
    </aside>
  );
}
