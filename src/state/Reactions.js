import { createSlice } from '@reduxjs/toolkit'

const ReactionsSlice = createSlice({
    name: "Reactions",
    initialState: {
        /**
         * User reactions
         */
        user: [],
    },
    reducers: {
        addReaction: (state, action) => {
          state.user.push(action.payload)
        },
    }
});

export const { addReaction } = ReactionsSlice.actions;
export const reducer = ReactionsSlice.reducer;
