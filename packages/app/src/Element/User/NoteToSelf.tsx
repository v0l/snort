import "./NoteToSelf.css";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import Icon from "Icons/Icon";

import messages from "../messages";

export interface NoteToSelfProps {
  className?: string;
}

function NoteLabel() {
  return (
    <div className="bold flex items-center g4">
      <FormattedMessage {...messages.NoteToSelf} /> <Icon name="badge" size={15} />
    </div>
  );
}

export default function NoteToSelf({ className }: NoteToSelfProps) {
  return (
    <div className={classNames("nts", className)}>
      <div className="avatar-wrapper">
        <div className="avatar">
          <Icon name="book-closed" size={20} />
        </div>
      </div>
      <NoteLabel />
    </div>
  );
}
