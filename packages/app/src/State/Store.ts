import { configureStore } from "@reduxjs/toolkit";
import { reducer as LoginReducer } from "State/Login";
import { reducer as NoteCreatorReducer } from "State/NoteCreator";

const store = configureStore({
  reducer: {
    login: LoginReducer,
    noteCreator: NoteCreatorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
