import * as Y from 'yjs';

const docMap = new Map<string, Y.Doc>();

// Deterministic color palette for collaborators
const COLLABORATOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export function getOrCreateDoc(noteId: string): Y.Doc {
  if (!docMap.has(noteId)) {
    const doc = new Y.Doc();
    docMap.set(noteId, doc);
  }
  return docMap.get(noteId)!;
}

export function destroyDoc(noteId: string): void {
  const doc = docMap.get(noteId);
  if (doc) {
    doc.destroy();
    docMap.delete(noteId);
  }
}

export function generateCollaboratorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

export function getActiveDocCount(): number {
  return docMap.size;
}
