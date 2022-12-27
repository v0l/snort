import { useContext, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NostrContext } from "../..";
import { addPubKey } from "../../state/Users";

export default function useProfile(pubKey) {
    const dispatch = useDispatch();
    const system = useContext(NostrContext);
    const user = useSelector(s => s.users.users[pubKey]);
    const pubKeys = useSelector(s => s.users.pubKeys);

    useEffect(() => {
        if (!pubKeys.includes(pubKey)) {
            dispatch(addPubKey(pubKey));
        }
    }, []);

    return user;
}