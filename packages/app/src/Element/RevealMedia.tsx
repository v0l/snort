import { FormattedMessage } from "react-intl";
import { useSelector } from "react-redux";

import MediaLink from "Element/MediaLink";
import Reveal from "Element/Reveal";
import { RootState } from "State/Store";

interface RevealMediaProps {
  creator: string;
  link: string;
}

export default function RevealMedia(props: RevealMediaProps) {
  const pref = useSelector((s: RootState) => s.login.preferences);
  const follows = useSelector((s: RootState) => s.login.follows);
  const publicKey = useSelector((s: RootState) => s.login.publicKey);

  const hideNonFollows = pref.autoLoadMedia === "follows-only" && !follows.includes(props.creator);
  const isMine = props.creator === publicKey;
  const hideMedia = pref.autoLoadMedia === "none" || (!isMine && hideNonFollows);
  const hostname = new URL(props.link).hostname;

  if (hideMedia) {
    return (
      <Reveal
        message={<FormattedMessage defaultMessage="Click to load content from {link}" values={{ link: hostname }} />}>
        <MediaLink link={props.link} />
      </Reveal>
    );
  } else {
    return <MediaLink link={props.link} />;
  }
}
