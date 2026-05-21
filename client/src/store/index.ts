import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import authReducer from './authSlice';
import workspaceReducer from './workspaceSlice';
import folderReducer from './folderSlice';
import noteReducer from './noteSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    folder: folderReducer,
    note: noteReducer,
    ui: uiReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectActiveWorkspaceId = (state: RootState) => state.workspace.activeWorkspaceId;
export const selectExpandedFolderIds = (state: RootState) => state.folder.expandedFolderIds;
export const selectActiveNoteId = (state: RootState) => state.note.activeNoteId;
export const selectSaveStatus = (state: RootState) => state.note.saveStatus;
export const selectResolvingNoteIds = (state: RootState) => state.note.resolvingNoteIds;
export const selectIsSearchOpen = (state: RootState) => state.ui.isSearchOpen;
export const selectIsDarkMode = (state: RootState) => state.ui.isDarkMode;
export const selectIsOffline = (state: RootState) => state.ui.isOffline;
export const selectIsSyncing = (state: RootState) => state.ui.isSyncing;
export const selectConflicts = (state: RootState) => state.ui.conflicts;
export const selectIsSidebarCollapsed = (state: RootState) => state.ui.isSidebarCollapsed;
