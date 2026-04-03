import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Folder } from '@/types';

interface FolderState {
  folders: Folder[];
  expandedFolderIds: string[];
}

const initialState: FolderState = {
  folders: [],
  expandedFolderIds: [],
};

const folderSlice = createSlice({
  name: 'folder',
  initialState,
  reducers: {
    setFolders(state, action: PayloadAction<Folder[]>) {
      state.folders = action.payload;
    },
    toggleFolderExpanded(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.expandedFolderIds.indexOf(id);
      if (idx >= 0) {
        state.expandedFolderIds.splice(idx, 1);
      } else {
        state.expandedFolderIds.push(id);
      }
    },
    expandFolder(state, action: PayloadAction<string>) {
      if (!state.expandedFolderIds.includes(action.payload)) {
        state.expandedFolderIds.push(action.payload);
      }
    },
    collapseFolder(state, action: PayloadAction<string>) {
      state.expandedFolderIds = state.expandedFolderIds.filter(
        id => id !== action.payload
      );
    },
    addFolder(state, action: PayloadAction<Folder>) {
      state.folders.push(action.payload);
    },
    removeFolder(state, action: PayloadAction<string>) {
      state.folders = state.folders.filter(f => f.id !== action.payload);
    },
    renameFolder(state, action: PayloadAction<{ id: string; name: string }>) {
      const folder = state.folders.find(f => f.id === action.payload.id);
      if (folder) folder.name = action.payload.name;
    },
  },
});

export const {
  setFolders,
  toggleFolderExpanded,
  expandFolder,
  collapseFolder,
  addFolder,
  removeFolder,
  renameFolder,
} = folderSlice.actions;
export default folderSlice.reducer;
