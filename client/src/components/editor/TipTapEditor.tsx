import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import { CollaborationCursorsExtension } from '@/components/editor/CollaborationCursorsExtension';
import type { Collaborator } from '@/types';

interface TipTapEditorProps {
  noteId: string;
  /** undefined = parent still fetching; do not initialize or emit */
  initialContent?: string;
  onChange: (content: string) => void;
  onEditorReady?: (editor: Editor) => void;
  /** Called once after persisted content is applied to the editor */
  onEditorHydrated?: () => void;
  /**
   * Register a function the parent can call to push remote content into the editor.
   * The registered function receives (content: string, title: string).
   * It must NOT trigger onChange (to avoid save loops).
   */
  onRegisterRemoteUpdater?: (updater: (content: string, title: string) => void) => void;
  /** Remote users in this note (carets rendered in-editor) */
  collaborators?: Collaborator[];
  /** This client's session id — used to hide own caret decoration */
  sessionId?: string;
  /** Emits ProseMirror selection positions for live cursor sync */
  onCursorChange?: (anchor: number, head: number) => void;
  isReadOnly?: boolean;
}

/** Parse content — handles HTML and legacy ProseMirror JSON */
function parseContent(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed && 'type' in parsed) return trimmed;
    } catch { /* treat as HTML */ }
  }
  return raw;
}

/**
 * Custom extension: pressing Enter at the end of a code block, blockquote,
 * or after an image exits the block and creates a new paragraph below.
 * Also handles Shift+Enter to insert a hard break inside blocks.
 */
const ExitOnEnter = Extension.create({
  name: 'exitOnEnter',
  addKeyboardShortcuts() {
    return {
      // Enter at end of code block → exit to new paragraph
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Exit code block on Enter at end of last line
        if (editor.isActive('codeBlock')) {
          const node = $from.node();
          const isAtEnd = $from.parentOffset === node.content.size;
          const text = node.textContent;
          // If last two chars are newlines (user pressed Enter twice), exit
          if (isAtEnd && text.endsWith('\n')) {
            return editor
              .chain()
              .command(({ tr }) => {
                // Delete the trailing newline
                tr.delete($from.pos - 1, $from.pos);
                return true;
              })
              .exitCode()
              .run();
          }
          return false; // normal Enter inside code block
        }

        // Exit blockquote on Enter on empty line
        if (editor.isActive('blockquote')) {
          const node = $from.node();
          if (node.textContent === '') {
            return editor
              .chain()
              .liftEmptyBlock()
              .run();
          }
          return false;
        }

        return false;
      },

      // Shift+Enter → hard break inside any block (instead of new paragraph)
      'Shift-Enter': ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          return editor.commands.insertContent('\n');
        }
        return editor.commands.setHardBreak();
      },

      // Tab inside code block → insert 2 spaces
      Tab: ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          return editor.commands.insertContent('  ');
        }
        return false;
      },

      // Escape → exit code block / blockquote to paragraph after
      Escape: ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          return editor.chain().exitCode().run();
        }
        if (editor.isActive('blockquote')) {
          return editor
            .chain()
            .liftEmptyBlock()
            .run();
        }
        return false;
      },

      // Arrow down at end of last block → add paragraph after
      ArrowDown: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $to } = selection;
        const isAtDocEnd = $to.pos === state.doc.content.size - 1;

        if (isAtDocEnd && (editor.isActive('codeBlock') || editor.isActive('blockquote') || editor.isActive('image'))) {
          return editor
            .chain()
            .focus('end')
            .insertContentAt(editor.state.doc.content.size, { type: 'paragraph' })
            .focus('end')
            .run();
        }
        return false;
      },
    };
  },
});

export function TipTapEditor({
  noteId,
  initialContent,
  onChange,
  onEditorReady,
  onEditorHydrated,
  onRegisterRemoteUpdater,
  collaborators = [],
  sessionId = '',
  onCursorChange,
  isReadOnly = false,
}: TipTapEditorProps) {
  const initialised = useRef(false);
  const prevNoteIdRef = useRef('');
  const skipNextUpdateRef = useRef(true);
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;
  // Flag to suppress onChange during remote updates (avoid save loop)
  const isApplyingRemoteRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: 'not-prose' } },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: false }),
      ExitOnEnter,
      CollaborationCursorsExtension,
    ],
    content: '<p></p>',
    editable: !isReadOnly,
    onUpdate: ({ editor: e }) => {
      if (isApplyingRemoteRef.current) return;
      // TipTap fires onUpdate on create; ignore until real content is hydrated
      if (skipNextUpdateRef.current) return;
      onChange(e.getHTML());
    },
    onSelectionUpdate: ({ editor: e }) => {
      if (isApplyingRemoteRef.current || skipNextUpdateRef.current || isReadOnly) return;
      const { from, to } = e.state.selection;
      onCursorChangeRef.current?.(from, to);
    },
  });

  // Paint remote collaborator carets + name tags
  useEffect(() => {
    if (!editor) return;
    const storage = editor.storage.collaborationCursors;
    if (!storage) return;
    storage.collaborators = collaborators;
    storage.sessionId = sessionId;
    editor.view.dispatch(editor.state.tr);
  }, [editor, collaborators, sessionId]);

  // Load content when noteId changes or initialContent arrives
  useEffect(() => {
    if (!editor) return;

    const noteChanged = prevNoteIdRef.current !== noteId;
    if (noteChanged) {
      prevNoteIdRef.current = noteId;
      initialised.current = false;
      skipNextUpdateRef.current = true;
    }

    if (initialised.current) return;
    if (initialContent === undefined) return;

    const content = parseContent(initialContent);
    const t = setTimeout(() => {
      isApplyingRemoteRef.current = true;
      try {
        editor.commands.setContent(content || '<p></p>', false);
      } catch {
        editor.commands.setContent('<p></p>', false);
      }
      initialised.current = true;
      skipNextUpdateRef.current = false;
      isApplyingRemoteRef.current = false;
      onEditorHydrated?.();
    }, 20);
    return () => clearTimeout(t);
  }, [editor, noteId, initialContent, onEditorHydrated]);

  // Expose editor to parent (toolbar)
  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    editor?.setEditable(!isReadOnly);
  }, [editor, isReadOnly]);

  // Register a remote updater so remote content changes update the editor without triggering save
  useEffect(() => {
    if (!editor || !onRegisterRemoteUpdater) return;

    const applyRemoteContent = (content: string, _title: string) => {
      if (!editor) return;
      const parsed = parseContent(content);
      // Save cursor position before applying
      const { from, to } = editor.state.selection;
      isApplyingRemoteRef.current = true;
      try {
        skipNextUpdateRef.current = true;
        editor.commands.setContent(parsed || '<p></p>', false);
        skipNextUpdateRef.current = false;
        // Restore cursor within bounds
        const docSize = editor.state.doc.content.size;
        const safeFrom = Math.min(from, Math.max(1, docSize - 1));
        const safeTo = Math.min(to, Math.max(1, docSize - 1));
        if (safeFrom > 0 && safeFrom <= docSize - 1) {
          editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
        }
      } finally {
        isApplyingRemoteRef.current = false;
      }
    };

    onRegisterRemoteUpdater(applyRemoteContent);
  }, [editor, onRegisterRemoteUpdater]);

  return (
    <div className="flex-1 bg-white dark:bg-gray-950">
      <EditorContent
        editor={editor}
        className="
          prose prose-lg prose-gray dark:prose-invert max-w-none
          px-16 py-12
          min-h-[calc(100vh-180px)]
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror]:min-h-[calc(100vh-180px)]
          [&_.ProseMirror_p.is-empty:first-child::before]:content-['Start_writing…']
          [&_.ProseMirror_p.is-empty:first-child::before]:text-gray-300
          [&_.ProseMirror_p.is-empty:first-child::before]:dark:text-gray-600
          [&_.ProseMirror_p.is-empty:first-child::before]:pointer-events-none
          [&_.ProseMirror_p.is-empty:first-child::before]:float-left
          [&_.ProseMirror_p.is-empty:first-child::before]:h-0
          [&_.ProseMirror_pre]:bg-gray-900
          [&_.ProseMirror_pre]:text-gray-100
          [&_.ProseMirror_pre]:rounded-lg
          [&_.ProseMirror_pre]:p-4
          [&_.ProseMirror_pre]:font-mono
          [&_.ProseMirror_pre]:text-sm
          [&_.ProseMirror_pre]:overflow-x-auto
          [&_.ProseMirror_pre]:my-4
          [&_.ProseMirror_blockquote]:border-l-4
          [&_.ProseMirror_blockquote]:border-indigo-400
          [&_.ProseMirror_blockquote]:pl-4
          [&_.ProseMirror_blockquote]:italic
          [&_.ProseMirror_blockquote]:text-gray-600
          [&_.ProseMirror_blockquote]:dark:text-gray-400
          [&_.ProseMirror_blockquote]:my-4
          [&_.ProseMirror_hr]:border-gray-200
          [&_.ProseMirror_hr]:dark:border-gray-700
          [&_.ProseMirror_hr]:my-6
          [&_.ProseMirror_img]:rounded-lg
          [&_.ProseMirror_img]:max-w-full
          [&_.ProseMirror_img]:my-4
          [&_.ProseMirror_img]:cursor-default
        "
        aria-label="Note content editor"
        aria-multiline="true"
      />
    </div>
  );
}
