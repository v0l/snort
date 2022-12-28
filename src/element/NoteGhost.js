import "./Note.css";
import ProfileImage from "./ProfileImage";

export default function NoteGhost(props) {
    return (
        <div className="note">
            <div className="header">
                <ProfileImage pubKey="" />
            </div>
            <div className="body">
                {props.text ?? "Loading..."}
            </div>
            <div className="footer">
            </div>
        </div>
    );
}