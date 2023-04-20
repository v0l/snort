import { configureStore } from "@reduxjs/toolkit";
import { reducer as NoteCreatorReducer } from "State/NoteCreator";
import { reducer as ReBroadcastReducer } from "State/ReBroadcast";

const store = configureStore({
  reducer: {
    noteCreator: NoteCreatorReducer,
    reBroadcast: ReBroadcastReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
