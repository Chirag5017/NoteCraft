'use strict';

jest.mock('../../src/models/note.model');

const Note = require('../../src/models/note.model');
const { syncNotes } = require('../../src/services/sync.service');

describe('Sync Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds note to synced when local updatedAt is newer than server', async () => {
    const serverDate = new Date('2024-01-01T10:00:00Z');
    const localDate = new Date('2024-01-01T12:00:00Z'); // newer

    const serverNote = {
      _id: 'note-1',
      title: 'Old Title',
      content: 'Old content',
      updatedAt: serverDate,
      toJSON: () => ({ id: 'note-1', title: 'Old Title', updatedAt: serverDate }),
    };

    Note.findById = jest.fn().mockResolvedValue(serverNote);
    Note.findByIdAndUpdate = jest.fn().mockResolvedValue({});

    const notes = [{ id: 'note-1', title: 'New Title', content: 'New content', updatedAt: localDate.toISOString() }];
    const result = await syncNotes(notes, 'user-1');

    expect(result.synced).toContain('note-1');
    expect(result.conflicts).toHaveLength(0);
    expect(Note.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('adds note to conflicts when local updatedAt is older than server', async () => {
    const serverDate = new Date('2024-01-01T12:00:00Z');
    const localDate = new Date('2024-01-01T10:00:00Z'); // older

    const serverNote = {
      _id: 'note-2',
      title: 'Server Title',
      content: 'Server content',
      updatedAt: serverDate,
      toJSON: () => ({ id: 'note-2', title: 'Server Title', updatedAt: serverDate }),
    };

    Note.findById = jest.fn().mockResolvedValue(serverNote);

    const notes = [{ id: 'note-2', title: 'Local Title', content: 'Local content', updatedAt: localDate.toISOString() }];
    const result = await syncNotes(notes, 'user-1');

    expect(result.synced).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].noteId).toBe('note-2');
    expect(result.conflicts[0].localVersion).toMatchObject({ id: 'note-2' });
    expect(result.conflicts[0].serverVersion).toBeDefined();
  });

  it('creates note and adds to synced when note does not exist on server', async () => {
    Note.findById = jest.fn().mockResolvedValue(null);
    const created = { _id: 'note-3', toJSON: () => ({ id: 'note-3' }) };
    Note.create = jest.fn().mockResolvedValue(created);

    const notes = [{ id: 'note-3', title: 'New Note', workspaceId: 'ws-1', updatedAt: new Date().toISOString() }];
    const result = await syncNotes(notes, 'user-1');

    expect(result.synced).toContain('note-3');
    expect(result.conflicts).toHaveLength(0);
  });

  it('processes batch independently — conflict on one note does not affect others', async () => {
    const serverDate = new Date('2024-01-01T12:00:00Z');
    const olderDate = new Date('2024-01-01T10:00:00Z');
    const newerDate = new Date('2024-01-01T14:00:00Z');

    const serverNote1 = { _id: 'note-a', updatedAt: serverDate, toJSON: () => ({ id: 'note-a' }) };
    const serverNote2 = { _id: 'note-b', updatedAt: serverDate, toJSON: () => ({ id: 'note-b' }) };

    Note.findById = jest.fn()
      .mockResolvedValueOnce(serverNote1)
      .mockResolvedValueOnce(serverNote2);
    Note.findByIdAndUpdate = jest.fn().mockResolvedValue({});

    const notes = [
      { id: 'note-a', updatedAt: newerDate.toISOString() }, // newer → synced
      { id: 'note-b', updatedAt: olderDate.toISOString() }, // older → conflict
    ];
    const result = await syncNotes(notes, 'user-1');

    expect(result.synced).toContain('note-a');
    expect(result.conflicts.map(c => c.noteId)).toContain('note-b');
  });
});
