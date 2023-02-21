import { configureStore } from "@reduxjs/toolkit";
import { reducer as LoginReducer } from "State/Login";
import { reducer as UsersReducer } from "State/Users";
import { reducer as CacheReducer } from "State/Cache";

const store = configureStore({
  reducer: {
    login: LoginReducer,
    users: UsersReducer,
    cache: CacheReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
