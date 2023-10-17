import { useUserProfile } from "@snort/system-react";
import Avatar from "Element/User/Avatar";
import useLogin from "Hooks/useLogin";
import "./Nav.css";
import Icon from "Icons/Icon";
import { Link } from "react-router-dom";
import { NoteCreatorButton } from "Element/Event/NoteCreatorButton";
import { ProfileLink } from "Element/User/ProfileLink";

export function DeckNav() {
  const { publicKey } = useLogin();
  const profile = useUserProfile(publicKey);

  const unreadDms = 0;

  return (
    <nav className="deck flex flex-col justify-between">
      <div className="flex flex-col items-center g24">
        <Link className="btn" to="/messages">
          <Icon name="mail" size={24} />
          {unreadDms > 0 && <span className="has-unread"></span>}
        </Link>
        <NoteCreatorButton />
      </div>
      <div className="flex flex-col items-center g16">
        {/*<Link className="btn" to="/">
          <Icon name="grid-01" size={24} />
  </Link>*/}
        <Link className="btn" to="/settings">
          <Icon name="settings-02" size={24} />
        </Link>
        <ProfileLink pubkey={publicKey ?? ""} user={profile}>
          <Avatar pubkey={publicKey ?? ""} user={profile} />
        </ProfileLink>
      </div>
    </nav>
  );
}
