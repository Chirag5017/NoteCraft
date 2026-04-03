import { useState, useRef, useEffect } from 'react';
import { Search, Settings, LogOut, ChevronDown, PanelLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store';
import { setSearchOpen, toggleSidebar } from '@/store/uiSlice';
import { cn } from '@/utils/cn';

export function TopNav() {
  const { user, logout } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
          NoteCraft
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => dispatch(setSearchOpen(true))}
          aria-label="Open search (Cmd+K)"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1">
            ⌘K
          </kbd>
        </button>

        {user && (
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsDropdownOpen(v => !v)}
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Avatar user={user} size="sm" />
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>

            {isDropdownOpen && (
              <div
                role="menu"
                className={cn(
                  'absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg',
                  'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
                  'py-1 z-50 animate-fade-in'
                )}
              >
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  role="menuitem"
                  onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
