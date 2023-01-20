import "./NoteToSelf.css";

import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faCertificate } from "@fortawesome/free-solid-svg-icons"
import useProfile from "Feed/ProfileFeed";
import Nip05 from "Element/Nip05";
import { profileLink } from "Util";

export interface NoteToSelfProps {
    pubkey: string,
    clickable?: boolean
    className?: string,
    link?: string
};

function NoteLabel({pubkey, link}:NoteToSelfProps) {
    const user = useProfile(pubkey)?.get(pubkey);
    return (
        <div>
            Note to Self <FontAwesomeIcon icon={faCertificate} size="xs" />
            {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
        </div>
    )
}

export default function NoteToSelf({ pubkey, clickable, className, link }: NoteToSelfProps) {
    const navigate = useNavigate();

    const clickLink = () => {
        if(clickable) {
            navigate(link ?? profileLink(pubkey))
        }
    }

    return (
        <div className={`nts${className ? ` ${className}` : ""}`}>
            <div className="avatar-wrapper">
                <div className={`avatar${clickable ? " clickable" : ""}`}>
                    <FontAwesomeIcon onClick={clickLink} className="note-to-self" icon={faBook} size="2xl" />
                </div>
            </div>
            <div className="f-grow">
                <div className="name">
                    {clickable && (
                        <Link to={link ?? profileLink(pubkey)}>
                            <NoteLabel pubkey={pubkey} />
                        </Link>
                    ) || (
                        <NoteLabel pubkey={pubkey} />
                    )}
                </div>
            </div>
        </div>
    )
}
