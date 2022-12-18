import { configureStore } from "@reduxjs/toolkit";
import { reducer as TimelineReducer } from "./Timeline";
import { reducer as UsersReducer } from "./Users";
import { reducer as LoginReducer } from "./Login";

const Store = configureStore({
    reducer: {
        timeline: TimelineReducer,
        users: UsersReducer,
        login: LoginReducer
    }
});

export default Store;