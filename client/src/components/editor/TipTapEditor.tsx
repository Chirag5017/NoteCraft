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
import type { Collaborator } from '@/types';

interface TipTapEditorProps {
  noteId: string;
  initialContent: string;
  onChange: (content: string) => void;
  onEditorReady?: (editor: Editor) => void;
  collaborators?: Collaborator[];
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
  isReadOnly = false,
}: TipTapEditorProps) {
  const initialised = useRef(false);
  const prevNoteIdRef = useRef('');

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
    ],
    content: '<p></p>',
    editable: !isReadOnly,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  // Load content when noteId changes or initialContent arrives
  useEffect(() => {
    if (!editor) return;

    const noteChanged = prevNoteIdRef.current !== noteId;
    if (noteChanged) {
      prevNoteIdRef.current = noteId;
      initialised.current = false;
    }

    if (initialised.current) return;
    if (!initialContent) return;

    const content = parseContent(initialContent);
    const t = setTimeout(() => {
      try {
        editor.commands.setContent(content, false);
      } catch {
        editor.commands.setContent('<p></p>', false);
      }
      initialised.current = true;
    }, 20);
    return () => clearTimeout(t);
  }, [editor, noteId, initialContent]);

  // Expose editor to parent (toolbar)
  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    editor?.setEditable(!isReadOnly);
  }, [editor, isReadOnly]);

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
