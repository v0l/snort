import "./Note.css";
import ProfileImage from "Element/ProfileImage";

export default function NoteGhost(props: any) {
    const className = `note card ${props.className ? props.className : ''}`
    return (
        <div className={className}>
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
