import "./Note.css";
import ProfileImage from "./ProfileImage";

export default function NoteGhost(props) {
    return (
        <div className="note">
            <div className="header">
                <ProfileImage pubkey="" />
            </div>
            <div className="body">
                {props.children}
            </div>
            <div className="footer">
            </div>
        </div>
    );
}