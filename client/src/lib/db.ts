import Dexie, { type Table } from 'dexie';
import type { Note, SyncQueueItem } from '@/types';

class NoteCraftDB extends Dexie {
  notes!: Table<Note>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('NoteCraftDB');
    this.version(1).stores({
      notes: 'id, folderId, workspaceId, updatedAt',
      syncQueue: '++id, noteId, needsSync',
    });
  }
}

export const db = new NoteCraftDB();
