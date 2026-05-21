import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Code, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ImageIcon, Highlighter, Undo, Redo, Minus,
  Download, FileCode, FileJson, FileText, FileType,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { exportNote, type ExportFormat } from '@/utils/exportNote';

interface ToolbarProps {
  editor: Editor | null;
  noteTitle?: string;
}

function Btn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'p-1.5 rounded transition-colors',
        'text-gray-600 dark:text-gray-400',
        'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        active && 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 self-center shrink-0" />;
}

const TEXT_COLORS = [
  { hex: '#000000', label: 'Black' },
  { hex: '#374151', label: 'Dark gray' },
  { hex: '#6B7280', label: 'Gray' },
  { hex: '#EF4444', label: 'Red' },
  { hex: '#F97316', label: 'Orange' },
  { hex: '#EAB308', label: 'Yellow' },
  { hex: '#22C55E', label: 'Green' },
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#8B5CF6', label: 'Purple' },
  { hex: '#EC4899', label: 'Pink' },
];

const HIGHLIGHT_COLORS = [
  { hex: '#FEF08A', label: 'Yellow' },
  { hex: '#BBF7D0', label: 'Green' },
  { hex: '#BAE6FD', label: 'Blue' },
  { hex: '#FBCFE8', label: 'Pink' },
  { hex: '#DDD6FE', label: 'Purple' },
  { hex: '#FED7AA', label: 'Orange' },
  { hex: '#FECACA', label: 'Red' },
  { hex: '#E5E7EB', label: 'Gray' },
];

const EXPORT_OPTIONS: Array<{
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  { format: 'html', label: 'HTML', description: 'Web page', icon: <FileCode className="h-4 w-4" /> },
  { format: 'md', label: 'Markdown', description: 'Portable notes', icon: <FileText className="h-4 w-4" /> },
  { format: 'txt', label: 'Plain text', description: 'Readable anywhere', icon: <FileText className="h-4 w-4" /> },
  { format: 'pdf', label: 'PDF', description: 'Print or save', icon: <FileType className="h-4 w-4" /> },
  { format: 'doc', label: 'DOC', description: 'Opens in Word', icon: <FileType className="h-4 w-4" /> },
  { format: 'json', label: 'JSON', description: 'Structured backup', icon: <FileJson className="h-4 w-4" /> },
];

export function Toolbar({ editor, noteTitle = 'Untitled note' }: ToolbarProps) {
  const [showColor, setShowColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Show a placeholder bar while editor is initializing
  if (!editor) {
    return (
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm h-10">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="w-7 h-6 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('image', file);

        const token = localStorage.getItem('notecraft_token');
        const apiUrl = import.meta.env.VITE_API_URL as string;

        const res = await fetch(`${apiUrl}/upload/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token ?? ''}` },
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(errData.error || 'Upload failed');
        }

        const data = await res.json() as { url: string };
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Image upload failed';
        alert(`Image upload failed: ${msg}`);
      }
    };
    input.click();
  };

  const activeColor = editor.getAttributes('textStyle').color as string | undefined;

  const handleExport = (format: ExportFormat) => {
    exportNote(editor, noteTitle, format);
    setShowExport(false);
  };

  return (
    <div
      role="toolbar"
      aria-label="Text formatting toolbar"
      className="flex items-center flex-wrap gap-0.5 px-3 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm sticky top-0 z-20"
    >
      {/* Undo / Redo */}
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
        <Undo className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
        <Redo className="h-4 w-4" />
      </Btn>

      <Sep />

      {/* Headings */}
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1 (Ctrl+Alt+1)">
        <Heading1 className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2 (Ctrl+Alt+2)">
        <Heading2 className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3 (Ctrl+Alt+3)">
        <Heading3 className="h-4 w-4" />
      </Btn>

      <Sep />

      {/* Inline formatting */}
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
        <Italic className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
        <Underline className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough (Ctrl+Shift+S)">
        <Strikethrough className="h-4 w-4" />
      </Btn>

      <Sep />

      {/* Text color */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); setShowColor(v => !v); setShowHighlight(false); }}
          title="Text color"
          aria-label="Text color"
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex flex-col items-center gap-0.5 transition-colors"
        >
          <span className="text-sm font-bold leading-none" style={{ color: activeColor || 'currentColor' }}>A</span>
          <div className="w-4 h-1 rounded-full" style={{ backgroundColor: activeColor || '#000' }} />
        </button>
        {showColor && (
          <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 w-52">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Text color</p>
            <div className="grid grid-cols-5 gap-2">
              {TEXT_COLORS.map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(hex).run(); setShowColor(false); }}
                  title={label}
                  aria-label={label}
                  className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-gray-400 hover:scale-110 transition-all"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowColor(false); }}
              className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Remove color
            </button>
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); setShowHighlight(v => !v); setShowColor(false); }}
          title="Highlight (Ctrl+Shift+H)"
          aria-label="Highlight color"
          className={cn(
            'p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
            editor.isActive('highlight') && 'bg-yellow-100 dark:bg-yellow-900/30'
          )}
        >
          <Highlighter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
        {showHighlight && (
          <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 w-52">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Highlight color</p>
            <div className="grid grid-cols-4 gap-2">
              {HIGHLIGHT_COLORS.map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHighlight({ color: hex }).run(); setShowHighlight(false); }}
                  title={label}
                  aria-label={`Highlight ${label}`}
                  className="w-10 h-10 rounded-lg border-2 border-transparent hover:border-gray-400 hover:scale-110 transition-all flex items-center justify-center"
                  style={{ backgroundColor: hex }}
                >
                  <span className="text-xs font-bold text-gray-700 opacity-60">A</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }}
              className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Remove highlight
            </button>
          </div>
        )}
      </div>

      <Sep />

      {/* Alignment */}
      <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left (Ctrl+Shift+L)">
        <AlignLeft className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center (Ctrl+Shift+E)">
        <AlignCenter className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right (Ctrl+Shift+R)">
        <AlignRight className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify (Ctrl+Shift+J)">
        <AlignJustify className="h-4 w-4" />
      </Btn>

      <Sep />

      {/* Lists */}
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list (Ctrl+Shift+8)">
        <List className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list (Ctrl+Shift+7)">
        <ListOrdered className="h-4 w-4" />
      </Btn>

      <Sep />

      {/* Code / Quote / HR */}
      <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block (Ctrl+Alt+C)">
        <Code className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote (Ctrl+Shift+B)">
        <Quote className="h-4 w-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule (Ctrl+Shift+-)">
        <Minus className="h-4 w-4" />
      </Btn>

      <Sep />

      {/* Image */}
      <Btn onClick={handleImageUpload} title="Insert image (Ctrl+Shift+I)">
        <ImageIcon className="h-4 w-4" />
      </Btn>

      <Sep />

      {/* Export */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={e => {
            e.preventDefault();
            setShowExport(v => !v);
            setShowColor(false);
            setShowHighlight(false);
          }}
          title="Export note"
          aria-label="Export note"
          aria-expanded={showExport}
          className="p-1.5 rounded transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <Download className="h-4 w-4" />
        </button>
        {showExport && (
          <div className="absolute top-full right-0 mt-1 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-50 p-1">
            {EXPORT_OPTIONS.map(option => (
              <button
                key={option.format}
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  handleExport(option.format);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-400">{option.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                    {option.label}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {option.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
