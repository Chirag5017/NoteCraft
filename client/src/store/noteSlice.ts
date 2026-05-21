import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SaveStatus } from '@/types';

interface NoteState {
  activeNoteId: string | null;
  saveStatus: SaveStatus;
  resolvingNoteIds: string[];
}

const initialState: NoteState = {
  activeNoteId: null,
  saveStatus: 'saved',
  resolvingNoteIds: [],
};

const noteSlice = createSlice({
  name: 'note',
  initialState,
  reducers: {
    setActiveNote(state, action: PayloadAction<string | null>) {
      state.activeNoteId = action.payload;
    },
    setSaveStatus(state, action: PayloadAction<SaveStatus>) {
      state.saveStatus = action.payload;
    },
    setNoteResolving(state, action: PayloadAction<{ noteId: string; isResolving: boolean }>) {
      if (action.payload.isResolving) {
        if (!state.resolvingNoteIds.includes(action.payload.noteId)) {
          state.resolvingNoteIds.push(action.payload.noteId);
        }
      } else {
        state.resolvingNoteIds = state.resolvingNoteIds.filter(id => id !== action.payload.noteId);
      }
    },
  },
});

export const { setActiveNote, setSaveStatus, setNoteResolving } = noteSlice.actions;
export default noteSlice.reducer;
