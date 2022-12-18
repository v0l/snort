import { useContext, useEffect } from "react";
import { useDispatch } from "react-redux";
import { NostrContext } from "../..";
import { addPubKey } from "../../state/Users";

export default function useProfileFeed(id) {
    const dispatch = useDispatch();
    const system = useContext(NostrContext);
    
    useEffect(() => {
        dispatch(addPubKey(id));
    }, []);  
}