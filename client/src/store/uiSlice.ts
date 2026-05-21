import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ConflictItem } from '@/types';

interface UIState {
  isSearchOpen: boolean;
  isDarkMode: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  conflicts: ConflictItem[];
  isSidebarCollapsed: boolean;
}

const DARK_MODE_KEY = 'notecraft_dark_mode';
const CONFLICTS_KEY = 'notecraft_unresolved_conflicts';

function loadStoredConflicts(): ConflictItem[] {
  try {
    const raw = localStorage.getItem(CONFLICTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    localStorage.removeItem(CONFLICTS_KEY);
    return [];
  }
}

function storeConflicts(conflicts: ConflictItem[]) {
  if (conflicts.length > 0) {
    localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
  } else {
    localStorage.removeItem(CONFLICTS_KEY);
  }
}

const initialState: UIState = {
  isSearchOpen: false,
  isDarkMode: localStorage.getItem(DARK_MODE_KEY) === 'true',
  isOffline: !navigator.onLine,
  isSyncing: false,
  conflicts: loadStoredConflicts(),
  isSidebarCollapsed: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSearchOpen(state, action: PayloadAction<boolean>) {
      state.isSearchOpen = action.payload;
    },
    toggleDarkMode(state) {
      state.isDarkMode = !state.isDarkMode;
      localStorage.setItem(DARK_MODE_KEY, String(state.isDarkMode));
    },
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.isDarkMode = action.payload;
      localStorage.setItem(DARK_MODE_KEY, String(action.payload));
    },
    setOffline(state, action: PayloadAction<boolean>) {
      state.isOffline = action.payload;
    },
    setSyncing(state, action: PayloadAction<boolean>) {
      state.isSyncing = action.payload;
    },
    setConflicts(state, action: PayloadAction<ConflictItem[]>) {
      state.conflicts = action.payload;
      storeConflicts(action.payload);
    },
    clearConflicts(state) {
      state.conflicts = [];
      storeConflicts([]);
    },
    toggleSidebar(state) {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.isSidebarCollapsed = action.payload;
    },
  },
});

export const {
  setSearchOpen,
  toggleDarkMode,
  setDarkMode,
  setOffline,
  setSyncing,
  setConflicts,
  clearConflicts,
  toggleSidebar,
  setSidebarCollapsed,
} = uiSlice.actions;
export default uiSlice.reducer;
