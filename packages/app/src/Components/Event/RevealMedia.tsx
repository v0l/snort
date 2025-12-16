import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { MediaElement, type MediaElementProps } from "@/Components/Embed/MediaElement";
import Reveal from "@/Components/Event/Reveal";
import useFollowsControls from "@/Hooks/useFollowControls";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import { extensionToMime } from "@snort/system";
import { FileExtensionRegex } from "@/Utils/Const";

export type RevealMediaProps = Omit<MediaElementProps, "mime"> & {
  creator: string;
};

export default function RevealMedia(props: RevealMediaProps) {
  const publicKey = useLogin(s => s.publicKey);
  const autoLoadMedia = usePreferences(s => s.autoLoadMedia);
  const { isFollowing } = useFollowsControls();

  const hideNonFollows = autoLoadMedia === "follows-only" && !isFollowing(props.creator);
  const isMine = props.creator === publicKey;
  const hideMedia = autoLoadMedia === "none" || (!isMine && hideNonFollows);

  const url = new URL(props.src);
  const hostname = url.hostname;
  const ext = url.pathname.match(FileExtensionRegex);
  const mime = extensionToMime(ext?.[1] ?? "") ?? props.meta?.mimeType ?? "unknown";

  if (hideMedia) {
    return (
      <Reveal
        message={
          <FormattedMessage
            defaultMessage="You don't follow this person, click here to load media from <i>{link}</i>, or update <a><i>your preferences</i></a> to always load media from everybody."
            values={{
              i: i => <i>{i}</i>,
              a: a => <Link to="/settings/preferences">{a}</Link>,
              link: hostname,
            }}
          />
        }>
        <MediaElement mime={mime} {...props} />
      </Reveal>
    );
  } else {
    return <MediaElement mime={mime} {...props} />;
  }
}
