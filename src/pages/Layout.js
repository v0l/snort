import { useContext, useEffect } from "react"
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { NostrContext } from ".."
import useUsersStore from "./feed/UsersFeed";

export default function Layout(props) {
    const system = useContext(NostrContext);
    const navigate = useNavigate();
    const relays = useSelector(s => s.login.relays);

    useUsersStore();

    useEffect(() => {
        if (system && relays) {
            for (let r of relays) {
                system.ConnectToRelay(r);
            }
        }
    }, [relays, system]);

    return (
        <div className="page">
            <div className="header">
                <div>n o s t r</div>
                <div>
                    <div className="btn" onClick={() => navigate("/login")}>Login</div>
                </div>
            </div>

            {props.children}
        </div>
    )
}