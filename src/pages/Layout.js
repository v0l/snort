import { useContext, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { NostrContext } from ".."
import ProfileImage from "../element/ProfileImage";
import { init } from "../state/Login";
import useUsersStore from "./feed/UsersFeed";

export default function Layout(props) {
    const dispatch = useDispatch();
    const system = useContext(NostrContext);
    const navigate = useNavigate();
    const key = useSelector(s => s.login.publicKey);
    const relays = useSelector(s => s.login.relays);
    const users = useUsersStore();

    useEffect(() => {
        if (system && relays) {
            for (let r of relays) {
                system.ConnectToRelay(r);
            }
        }
    }, [relays, system]);

    useEffect(() => {
        dispatch(init());
    }, []);

    return (
        <div className="page">
            <div className="header">
                <div onClick={() => navigate("/")}>n o s t r</div>
                <div>
                    {key ? <ProfileImage pubKey={key} /> :
                        <div className="btn" onClick={() => navigate("/login")}>Login</div>
                    }
                </div>
            </div>

            {props.children}
        </div>
    )
}