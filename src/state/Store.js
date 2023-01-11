import { configureStore } from "@reduxjs/toolkit";
import { reducer as UsersReducer } from "./Users";
import { reducer as LoginReducer } from "./Login";
import { reducer as ReactionsReducer } from "./Reactions";

const Store = configureStore({
    reducer: {
        users: UsersReducer,
        login: LoginReducer,
        reactions: ReactionsReducer,
    }
});

export default Store;
