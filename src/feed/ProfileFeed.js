import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addPubKey } from "../state/Users";

export default function useProfile(pubKey) {
    const dispatch = useDispatch();
    const user = useSelector(s => s.users.users[pubKey]);

    useEffect(() => {
        if (pubKey !== "") {
            dispatch(addPubKey(pubKey));
        }
    }, [pubKey]);

    return user;
}