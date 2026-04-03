import type { Collaborator } from '@/types';

interface CollaboratorCursorProps {
  collaborator: Collaborator;
}

// This component is used as a decoration in TipTap via the Collaboration Cursor extension.
// The actual cursor rendering is handled by y-prosemirror / @tiptap/extension-collaboration-cursor.
// This component provides the label badge rendered inside the cursor decoration.
export function CollaboratorCursor({ collaborator }: CollaboratorCursorProps) {
  return (
    <span
      className="collaboration-cursor__label"
      style={{ backgroundColor: collaborator.color }}
      aria-hidden="true"
    >
      {collaborator.name}
    </span>
  );
}
