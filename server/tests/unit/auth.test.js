'use strict';

// Mock dependencies before requiring the controller
jest.mock('../../src/models/user.model');
jest.mock('bcrypt');
jest.mock('../../src/utils/jwt', () => ({
  signToken: jest.fn(() => 'mock-token'),
}));

const User = require('../../src/models/user.model');
const bcrypt = require('bcrypt');
const { signup, login } = require('../../src/controllers/auth.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Auth Controller - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('returns 400 EMAIL_EXISTS when email already in use', async () => {
      User.findOne = jest.fn().mockResolvedValue({ _id: 'existing-id', email: 'test@test.com' });

      const req = { body: { name: 'Test', email: 'test@test.com', password: 'password123' } };
      const res = mockRes();

      await signup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already in use', code: 'EMAIL_EXISTS' });
    });

    it('returns 201 with user and token on successful signup', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      bcrypt.hash = jest.fn().mockResolvedValue('hashed-password');
      const mockUser = { _id: 'new-id', name: 'Test', email: 'test@test.com', toJSON: () => ({ id: 'new-id', name: 'Test', email: 'test@test.com' }) };
      User.create = jest.fn().mockResolvedValue(mockUser);

      const req = { body: { name: 'Test', email: 'test@test.com', password: 'password123' } };
      const res = mockRes();

      await signup(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'mock-token' }));
    });
  });

  describe('login', () => {
    it('returns 401 INVALID_CREDENTIALS when password does not match', async () => {
      const mockUser = { _id: 'user-id', email: 'test@test.com', passwordHash: 'hashed' };
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const req = { body: { email: 'test@test.com', password: 'wrongpassword' } };
      const res = mockRes();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    });

    it('returns 401 INVALID_CREDENTIALS when user not found', async () => {
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = { body: { email: 'notfound@test.com', password: 'password' } };
      const res = mockRes();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    });

    it('returns 200 with user and token on successful login', async () => {
      const mockUser = {
        _id: 'user-id',
        email: 'test@test.com',
        passwordHash: 'hashed',
        toJSON: () => ({ id: 'user-id', email: 'test@test.com' }),
      };
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const req = { body: { email: 'test@test.com', password: 'correctpassword' } };
      const res = mockRes();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'mock-token' }));
    });
  });
});
