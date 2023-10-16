import { useUserProfile } from "@snort/system-react";
import Avatar from "Element/User/Avatar";
import useLogin from "Hooks/useLogin";
import "./Nav.css";
import Icon from "Icons/Icon";
import { Link } from "react-router-dom";
import { profileLink } from "SnortUtils";
import { NoteCreatorButton } from "Element/Event/NoteCreatorButton";

export function DeckNav() {
  const { publicKey } = useLogin();
  const profile = useUserProfile(publicKey);

  const unreadDms = 0;

  return (
    <nav className="deck flex-column f-space">
      <div className="flex-column f-center g24">
        <Link className="btn" to="/messages">
          <Icon name="mail" size={24} />
          {unreadDms > 0 && <span className="has-unread"></span>}
        </Link>
        <NoteCreatorButton />
      </div>
      <div className="flex-column f-center g16">
        {/*<Link className="btn" to="/">
          <Icon name="grid-01" size={24} />
  </Link>*/}
        <Link className="btn" to="/settings">
          <Icon name="settings-02" size={24} />
        </Link>
        <Link to={profileLink(publicKey ?? "")}>
          <Avatar pubkey={publicKey ?? ""} user={profile} />
        </Link>
      </div>
    </nav>
  );
}
