import { createSlice } from '@reduxjs/toolkit'

const ThreadSlice = createSlice({
    name: "Thread",
    initialState: {
        notes: [],
    },
    reducers: {
        setNotes: (state, action) => {
            state.notes = action.payload;
        },
        addNote: (state, action) => {
            if (!state.notes.some(n => n.id === action.payload.id)) {
                let tmp = new Set(state.notes);
                tmp.add(action.payload);
                state.notes = Array.from(tmp);
            }
        },
        reset: (state) => {
            state.notes = [];
        }
    }
});

export const { setNotes, addNote, reset } = ThreadSlice.actions;
export const reducer = ThreadSlice.reducer;