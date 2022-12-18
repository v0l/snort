import "./Root.css";
import Timeline from "./Timeline";
import { useSelector } from "react-redux";

export default function RootPage() {
    const login = useSelector(s => s.login.privateKey);

    function noteSigner() {
        return (
            <div className="send-note">
                <input type="text" placeholder="Sup?"></input>
                <div className="btn">Send</div>
            </div>
        );
    }

    return (
        <>
            {login ? noteSigner() : null}
            <Timeline></Timeline>
        </>
    );
}