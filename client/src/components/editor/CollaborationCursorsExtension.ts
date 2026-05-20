import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Collaborator } from '@/types';

export interface CollaborationCursorsStorage {
  collaborators: Collaborator[];
  sessionId: string;
}

const pluginKey = new PluginKey('collaborationCursors');

function createCaretWidget(name: string, color: string): HTMLElement {
  const caret = document.createElement('span');
  caret.className = 'collaboration-cursor';
  caret.setAttribute('contenteditable', 'false');
  caret.style.borderLeft = `2px solid ${color}`;

  const label = document.createElement('span');
  label.className = 'collaboration-cursor__label';
  label.textContent = name;
  label.style.backgroundColor = color;
  caret.appendChild(label);

  return caret;
}

/** Renders remote collaborators' carets and selections (Google Docs style). */
export const CollaborationCursorsExtension = Extension.create<
  Record<string, never>,
  CollaborationCursorsStorage
>({
  name: 'collaborationCursors',

  addStorage() {
    return {
      collaborators: [] as Collaborator[],
      sessionId: '',
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            const { collaborators, sessionId } = extension.storage;
            const decorations: Decoration[] = [];

            for (const collaborator of collaborators) {
              if (collaborator.userId === sessionId) continue;
              if (!collaborator.cursor) continue;

              const docSize = state.doc.content.size;
              let { anchor, head } = collaborator.cursor;
              anchor = Math.max(0, Math.min(anchor, docSize));
              head = Math.max(0, Math.min(head, docSize));

              const from = Math.min(anchor, head);
              const to = Math.max(anchor, head);

              if (from !== to) {
                decorations.push(
                  Decoration.inline(from, to, {
                    style: `background-color: ${collaborator.color}40`,
                  })
                );
              }

              decorations.push(
                Decoration.widget(head, () => createCaretWidget(collaborator.name, collaborator.color), {
                  side: 1,
                  key: `cursor-${collaborator.userId}`,
                })
              );
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
