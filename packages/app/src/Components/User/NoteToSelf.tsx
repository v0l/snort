import classNames from "classnames";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";

import messages from "../messages";

export interface NoteToSelfProps {
  className?: string;
}

function NoteLabel() {
  return (
    <div className="font-bold flex items-center gap-1">
      <FormattedMessage {...messages.NoteToSelf} /> <Icon name="badge" size={15} />
    </div>
  );
}

export default function NoteToSelf({ className }: NoteToSelfProps) {
  return (
    <div className={classNames("flex items-center", className)}>
      <div className="mr-2">
        <div className="w-12 h-12 flex items-center justify-center cursor-pointer">
          <Icon name="book-closed" size={20} />
        </div>
      </div>
      <NoteLabel />
    </div>
  );
}
