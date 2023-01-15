import { configureStore } from "@reduxjs/toolkit";
import { reducer as UsersReducer } from "./Users";
import { reducer as LoginReducer } from "./Login";

const store = configureStore({
    reducer: {
        users: UsersReducer,
        login: LoginReducer
    }
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store;