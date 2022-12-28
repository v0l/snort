import { configureStore } from "@reduxjs/toolkit";
import { reducer as UsersReducer } from "./Users";
import { reducer as LoginReducer } from "./Login";
import { reducer as ThreadReducer } from "./Thread";

const Store = configureStore({
    reducer: {
        users: UsersReducer,
        login: LoginReducer,
        thread: ThreadReducer
    }
});

export default Store;