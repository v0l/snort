import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HexKey } from "../nostr";
import { RootState } from "../state/Store";
import { addPubKey, MetadataCache } from "../state/Users";

export default function useProfile(pubKey: HexKey) {
    const dispatch = useDispatch();
    const user = useSelector<RootState, MetadataCache>(s => s.users.users[pubKey]);

    useEffect(() => {
        if (pubKey) {
            dispatch(addPubKey(pubKey));
        }
    }, [pubKey]);

    return user;
}