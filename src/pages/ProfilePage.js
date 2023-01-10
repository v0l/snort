import "./ProfilePage.css";
import Nostrich from "../nostrich.jpg";

import { useState } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQrcode } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useParams } from "react-router-dom";

import useProfile from "../feed/ProfileFeed";
import FollowButton from "../element/FollowButton";
import { extractLnAddress, parseId } from "../Util";
import Timeline from "../element/Timeline";
import { extractLinks } from '../Text'
import LNURLTip from "../element/LNURLTip";
import Nip05 from "../element/Nip05";
import Copy from "../element/Copy";

export default function ProfilePage() {
    const params = useParams();
    const navigate = useNavigate();
    const id = parseId(params.id);
    const user = useProfile(id);
    const loginPubKey = useSelector(s => s.login.publicKey);
    const isMe = loginPubKey === id;
    const [showLnQr, setShowLnQr] = useState(false);

    function details() {
        const lnurl = extractLnAddress(user?.lud16 || user?.lud06 || "");
        return (
            <>
                <div className="flex name">
                    <div className="f-grow">
                        <h2>{user?.display_name || user?.name}</h2>
                        <Copy text={params.id} />
                        {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
                    </div>
                    <div>
                        {isMe ? <div className="btn" onClick={() => navigate("/settings")}>Settings</div> : <FollowButton pubkey={id} />}
                    </div>
                </div>
                <p>{extractLinks([user?.about])}</p>

                {user?.website && (
                  <div className="website">
                    <a href={user.website} target="_blank" rel="noreferrer">{user.website}</a>
                  </div>
                )}

                {lnurl ? <div className="flex">
                    <div className="btn" onClick={(e) => setShowLnQr(true)}>
                        <FontAwesomeIcon icon={faQrcode} size="xl" />
                    </div>
                    <div className="f-ellipsis">&nbsp; ⚡️ {lnurl}</div>
                </div> : null}
                <LNURLTip svc={lnurl} show={showLnQr} onClose={() => setShowLnQr(false)} />
            </>
        )
    }

    return (
        <>
            <div className="profile flex">
                <div className="avatar-wrapper">
                    <div style={{ backgroundImage: `url(${(user?.picture?.length ?? 0) === 0 ? Nostrich : user?.picture})` }} className="avatar">
                    </div>
                </div>
                <div className="f-grow details">
                  {details()}
                </div>
            </div>
            <div className="tabs">
                <div className="btn active">Notes</div>
                <div className="btn">Reactions</div>
                <div className="btn">Followers</div>
                <div className="btn">Follows</div>
            </div>
            <Timeline pubkeys={id} />
        </>
    )
}
