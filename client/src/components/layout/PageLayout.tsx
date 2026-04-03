import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';

interface PageLayoutProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function PageLayout({ sidebar, children }: PageLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        {sidebar && <Sidebar>{sidebar}</Sidebar>}
        <main className="flex-1 overflow-auto page-transition">
          {children}
        </main>
      </div>
    </div>
  );
}
