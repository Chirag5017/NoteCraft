import { useEffect, useRef } from 'react';
import { Pencil, Trash2, FolderPlus, FilePlus } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Folder } from '@/types';

interface FolderContextMenuProps {
  folder: Folder;
  position: { x: number; y: number };
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onAddSubfolder: (folder: Folder) => void;
  onAddNote: (folder: Folder) => void;
  onClose: () => void;
}

export function FolderContextMenu({
  folder,
  position,
  onRename,
  onDelete,
  onAddSubfolder,
  onAddNote,
  onClose,
}: FolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const menuItems = [
    {
      icon: <FilePlus className="h-4 w-4" />,
      label: 'New note',
      action: () => { onAddNote(folder); onClose(); },
    },
    {
      icon: <FolderPlus className="h-4 w-4" />,
      label: 'New subfolder',
      action: () => { onAddSubfolder(folder); onClose(); },
    },
    {
      icon: <Pencil className="h-4 w-4" />,
      label: 'Rename',
      action: () => { onRename(folder); onClose(); },
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: 'Delete',
      action: () => { onDelete(folder); onClose(); },
      danger: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Folder options"
      className={cn(
        'fixed z-50 w-44 rounded-xl shadow-lg py-1',
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
        'animate-fade-in'
      )}
      style={{ top: position.y, left: position.x }}
    >
      {menuItems.map(item => (
        <button
          key={item.label}
          role="menuitem"
          onClick={item.action}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
            item.danger
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
