import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SaveStatus } from '@/types';

interface NoteState {
  activeNoteId: string | null;
  saveStatus: SaveStatus;
}

const initialState: NoteState = {
  activeNoteId: null,
  saveStatus: 'saved',
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
  },
});

export const { setActiveNote, setSaveStatus } = noteSlice.actions;
export default noteSlice.reducer;
