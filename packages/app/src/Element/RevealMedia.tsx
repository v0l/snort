import { FormattedMessage } from "react-intl";

import MediaLink from "Element/MediaLink";
import Reveal from "Element/Reveal";
import useLogin from "Hooks/useLogin";

interface RevealMediaProps {
  creator: string;
  link: string;
}

export default function RevealMedia(props: RevealMediaProps) {
  const login = useLogin();
  const { preferences: pref, follows, publicKey } = login;

  const hideNonFollows = pref.autoLoadMedia === "follows-only" && !follows.item.includes(props.creator);
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
