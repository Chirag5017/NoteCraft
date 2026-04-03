import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Workspace } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
}

const initialState: WorkspaceState = {
  workspaces: [],
  activeWorkspaceId: null,
  isLoading: false,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspaces(state, action: PayloadAction<Workspace[]>) {
      state.workspaces = action.payload;
    },
    setActiveWorkspace(state, action: PayloadAction<string | null>) {
      state.activeWorkspaceId = action.payload;
    },
    setWorkspaceLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    addWorkspace(state, action: PayloadAction<Workspace>) {
      state.workspaces.push(action.payload);
    },
    removeWorkspace(state, action: PayloadAction<string>) {
      state.workspaces = state.workspaces.filter(w => w.id !== action.payload);
    },
  },
});

export const {
  setWorkspaces,
  setActiveWorkspace,
  setWorkspaceLoading,
  addWorkspace,
  removeWorkspace,
} = workspaceSlice.actions;
export default workspaceSlice.reducer;
