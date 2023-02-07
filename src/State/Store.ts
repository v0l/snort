import { configureStore } from "@reduxjs/toolkit";
import { reducer as LoginReducer } from "State/Login";
import { reducer as UsersReducer } from "State/Users";

const store = configureStore({
  reducer: {
    login: LoginReducer,
    users: UsersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
