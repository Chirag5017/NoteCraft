'use strict';

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    parentFolderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.workspaceId = ret.workspaceId ? ret.workspaceId.toString() : ret.workspaceId;
        ret.parentFolderId = ret.parentFolderId ? ret.parentFolderId.toString() : null;
        ret.createdBy = ret.createdBy ? ret.createdBy.toString() : ret.createdBy;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

folderSchema.index({ workspaceId: 1 });

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;
