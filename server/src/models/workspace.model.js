'use strict';

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.ownerId = ret.owner ? ret.owner.toString() : ret.owner;
        delete ret._id;
        delete ret.__v;
        delete ret.owner;
        return ret;
      },
    },
  }
);

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace;
