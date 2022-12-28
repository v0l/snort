import "./Note.css";
import moment from "moment";
import ProfileImage from "./ProfileImage";

export default function NoteGhost(props) {
    return (
        <div className="note">
            <div className="header">
                <ProfileImage pubKey="" />
                <div className="info">
                    {moment().fromNow()}
                </div>
            </div>
            <div className="body">
                Loading...
            </div>
            <div className="footer">
            </div>
        </div>
    );
}