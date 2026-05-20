export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  user: User;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  workspaceId: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  workspaceId: string;
  createdBy: string;
  updatedAt: string;
  createdAt: string;
  isShared?: boolean;
  sharePermission?: 'view' | 'edit';
}

export interface PublicNote {
  id: string;
  title: string;
  content: string;
  sharePermission: 'view' | 'edit';
  updatedAt: string;
  createdAt: string;
}

export interface SyncQueueItem {
  id?: number;
  noteId: string;
  needsSync: boolean;
}

export interface Collaborator {
  userId: string;
  name: string;
  color: string;
  cursor?: { anchor: number; head: number };
}

export interface SearchResult {
  noteId: string;
  noteTitle: string;
  workspaceId: string;
  workspaceName: string;
  folderId: string | null;
  folderName: string | null;
  snippet: string;
  highlights: Array<{ start: number; end: number }>;
}

export interface ConflictItem {
  noteId: string;
  localVersion: Note;
  serverVersion: Note;
}

export type SaveStatus = 'saved' | 'saving' | 'offline' | 'error';

// API payload types
export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateFolderPayload {
  name: string;
  workspaceId: string;
  parentFolderId?: string | null;
}

export interface CreateNotePayload {
  title: string;
  content?: string;
  folderId?: string | null;
  workspaceId: string;
}

export interface UpdateNotePayload {
  id: string;
  title?: string;
  content?: string;
  folderId?: string | null;
}

export interface SyncPayload {
  notes: Partial<Note>[];
}

export interface SyncResponse {
  synced: string[];
  conflicts: ConflictItem[];
}

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
}
