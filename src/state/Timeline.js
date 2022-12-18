import { createSlice } from '@reduxjs/toolkit'

const TimelineSlice = createSlice({
    name: "Timeline",
    initialState: {
        notes: [],
        follows: ["217e3d8b61c087b10422427e114737a4a4a4b1e15f22301fb4b07e1f33204d7c", "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"]
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
        setFollowers: (state, action) => {
            state.follows = action.payload;
        },
        addFollower: (state, action) => {
            let tmp = new Set(state.follows);
            tmp.add(action.payload);
            state.follows = Array.from(tmp);
        }
    }
});

export const { setNotes, addNote, setFollowers, addFollower } = TimelineSlice.actions;
export const reducer = TimelineSlice.reducer;