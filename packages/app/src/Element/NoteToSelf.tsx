import "./NoteToSelf.css";
import { Link, useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faCertificate } from "@fortawesome/free-solid-svg-icons";
import { profileLink } from "Util";

import messages from "./messages";

export interface NoteToSelfProps {
  pubkey: string;
  clickable?: boolean;
  className?: string;
  link?: string;
}

function NoteLabel() {
  return (
    <div>
      <FormattedMessage {...messages.NoteToSelf} /> <FontAwesomeIcon icon={faCertificate} size="xs" />
    </div>
  );
}

export default function NoteToSelf({ pubkey, clickable, className, link }: NoteToSelfProps) {
  const navigate = useNavigate();

  const clickLink = () => {
    if (clickable) {
      navigate(link ?? profileLink(pubkey));
    }
  };

  return (
    <div className={`nts${className ? ` ${className}` : ""}`}>
      <div className="avatar-wrapper">
        <div className={`avatar${clickable ? " clickable" : ""}`}>
          <FontAwesomeIcon onClick={clickLink} className="note-to-self" icon={faBook} size="2xl" />
        </div>
      </div>
      <div className="f-grow">
        <div className="name">
          {(clickable && (
            <Link to={link ?? profileLink(pubkey)}>
              <NoteLabel />
            </Link>
          )) || <NoteLabel />}
        </div>
      </div>
    </div>
  );
}
