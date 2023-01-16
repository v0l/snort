import { configureStore } from "@reduxjs/toolkit";
import { reducer as LoginReducer } from "./Login";

const store = configureStore({
    reducer: {
        login: LoginReducer
    }
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store;