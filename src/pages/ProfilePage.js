import "./ProfilePage.css";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import useProfile from "./feed/ProfileFeed";
import useProfileFeed from "./feed/ProfileFeed";
import { useState } from "react";

export default function ProfilePage() {
    const params = useParams();
    const id = params.id;
    const user = useProfile(id);
    const loginPubKey = useSelector(s => s.login.publicKey);
    const isMe = loginPubKey === id;

    let [name, setName] = useState(user?.name);
    let [about, setAbout] = useState(user?.amount);
    let [website, setWebsite] = useState(user?.website);

    function editor() {
        return (
            <>
                <div className="form-group">
                    <div>Name:</div>
                    <div>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <div>About:</div>
                    <div>
                        <input type="text" value={about} onChange={(e) => setAbout(e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <div>Website:</div>
                    <div>
                        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} />
                    </div>
                </div>
            </>
        )
    }

    return (
        <div className="profile">
            <div>
                <img src={user?.picture} className="avatar"/>
            </div>
            <div>
                {isMe ? editor() : null}
            </div>

        </div>
    )
}