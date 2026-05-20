'use strict';

jest.mock('../../src/models/workspace.model');
jest.mock('../../src/models/folder.model');
jest.mock('../../src/models/note.model');

const Workspace = require('../../src/models/workspace.model');
const { remove } = require('../../src/controllers/workspace.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('Workspace RBAC - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 FORBIDDEN when non-owner tries to delete workspace', async () => {
    const ownerId = 'owner-user-id';
    const memberId = 'member-user-id';

    const mockWorkspace = {
      _id: 'workspace-1',
      owner: { toString: () => ownerId },
      members: [
        { userId: { toString: () => memberId }, role: 'member' },
      ],
    };

    Workspace.findById = jest.fn().mockResolvedValue(mockWorkspace);

    const req = { params: { id: 'workspace-1' }, userId: memberId };
    const res = mockRes();

    await remove(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden', code: 'FORBIDDEN' });
  });

  it('returns 204 when owner deletes workspace', async () => {
    const ownerId = 'owner-user-id';

    const mockWorkspace = {
      _id: 'workspace-1',
      owner: { toString: () => ownerId },
      members: [],
    };

    Workspace.findById = jest.fn().mockResolvedValue(mockWorkspace);
    Workspace.findByIdAndDelete = jest.fn().mockResolvedValue({});

    const Note = require('../../src/models/note.model');
    const Folder = require('../../src/models/folder.model');
    Note.deleteMany = jest.fn().mockResolvedValue({});
    Folder.deleteMany = jest.fn().mockResolvedValue({});

    const req = { params: { id: 'workspace-1' }, userId: ownerId };
    const res = mockRes();

    await remove(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('returns 404 when workspace does not exist', async () => {
    Workspace.findById = jest.fn().mockResolvedValue(null);

    const req = { params: { id: 'nonexistent' }, userId: 'any-user' };
    const res = mockRes();

    await remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found', code: 'NOT_FOUND' });
  });
});
