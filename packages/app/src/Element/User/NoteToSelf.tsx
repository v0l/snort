import "./NoteToSelf.css";
import { Link, useNavigate } from "react-router-dom";
import FormattedMessage from "Element/FormattedMessage";
import { profileLink } from "SnortUtils";
import classNames from "classnames";

import messages from "../messages";
import Icon from "Icons/Icon";

export interface NoteToSelfProps {
  pubkey: string;
  clickable?: boolean;
  className?: string;
  link?: string;
}

function NoteLabel() {
  return (
    <div>
      <FormattedMessage {...messages.NoteToSelf} /> <Icon name="badge" size={15} />
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
    <div className={classNames("nts", className)}>
      <div className="avatar-wrapper">
        <div className={classNames("avatar", { clickable: clickable })}>
          <Icon onClick={clickLink} name="book-closed" size={20} />
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
