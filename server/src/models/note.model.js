'use strict';

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    yjsState: { type: Buffer },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.workspaceId = ret.workspaceId ? ret.workspaceId.toString() : ret.workspaceId;
        ret.folderId = ret.folderId ? ret.folderId.toString() : null;
        ret.createdBy = ret.createdBy ? ret.createdBy.toString() : ret.createdBy;
        ret.updatedBy = ret.updatedBy ? ret.updatedBy.toString() : ret.updatedBy;
        delete ret._id;
        delete ret.__v;
        delete ret.yjsState;
        return ret;
      },
    },
  }
);

noteSchema.index({ title: 'text', content: 'text' });
noteSchema.index({ workspaceId: 1 });

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
