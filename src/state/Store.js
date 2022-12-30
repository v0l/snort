import { configureStore } from "@reduxjs/toolkit";
import { reducer as UsersReducer } from "./Users";
import { reducer as LoginReducer } from "./Login";

const Store = configureStore({
    reducer: {
        users: UsersReducer,
        login: LoginReducer
    }
});

export default Store;