import classNames from "classnames";
import { FormattedMessage } from "react-intl";

interface NoteGhostProps {
  className?: string;
  link: string;
}

export default function NoteGhost(props: NoteGhostProps) {
  return (
    <div className={classNames("p bb", props.className)}>
      <FormattedMessage defaultMessage="Loading note: {id}" values={{ id: props.link }} />
    </div>
  );
}
