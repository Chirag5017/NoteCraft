import Dexie, { type Table } from 'dexie';
import type { Note, SyncQueueItem } from '@/types';

class NoteCraftDB extends Dexie {
  notes!: Table<Note>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('NoteCraftDB');
    // v1: original schema with needsSync index (caused boolean query issues)
    this.version(1).stores({
      notes: 'id, folderId, workspaceId, updatedAt',
      syncQueue: '++id, noteId, needsSync',
    });
    // v2: drop needsSync index — filter in JS instead (boolean indexes are unreliable in IndexedDB)
    this.version(2).stores({
      notes: 'id, folderId, workspaceId, updatedAt',
      syncQueue: '++id, noteId',
    });
  }
}

export const db = new NoteCraftDB();
