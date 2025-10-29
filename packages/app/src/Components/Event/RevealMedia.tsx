import { IMeta } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { MediaElement } from "@/Components/Embed/MediaElement";
import Reveal from "@/Components/Event/Reveal";
import useFollowsControls from "@/Hooks/useFollowControls";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import { FileExtensionRegex } from "@/Utils/Const";

export interface RevealMediaProps {
  creator: string;
  link: string;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  meta?: IMeta;
  size?: number;
}

export default function RevealMedia(props: RevealMediaProps) {
  const publicKey = useLogin(s => s.publicKey);
  const autoLoadMedia = usePreferences(s => s.autoLoadMedia);
  const { isFollowing } = useFollowsControls();

  const hideNonFollows = autoLoadMedia === "follows-only" && !isFollowing(props.creator);
  const isMine = props.creator === publicKey;
  const hideMedia = autoLoadMedia === "none" || (!isMine && hideNonFollows);

  const url = new URL(props.link);
  const hostname = url.hostname;
  const extension = FileExtensionRegex.test(url.pathname.toLowerCase()) && RegExp.$1;
  const type = (() => {
    switch (extension) {
      case "gif":
      case "jpg":
      case "jpeg":
      case "jfif":
      case "png":
      case "bmp":
      case "webp":
        return "image";
      case "wav":
      case "mp3":
      case "ogg":
        return "audio";
      case "mp4":
      case "mov":
      case "mkv":
      case "avi":
      case "m4v":
      case "webm":
        return "video";
      default:
        return "unknown";
    }
  })();

  if (hideMedia) {
    return (
      <Reveal
        message={
          <FormattedMessage
            defaultMessage="You don't follow this person, click here to load media from <i>{link}</i>, or update <a><i>your preferences</i></a> to always load media from everybody."
            id="HhcAVH"
            values={{
              i: i => <i>{i}</i>,
              a: a => <Link to="/settings/preferences">{a}</Link>,
              link: hostname,
            }}
          />
        }>
        <MediaElement
          mime={`${type}/${extension}`}
          url={url.toString()}
          onMediaClick={props.onMediaClick}
          meta={props.meta}
          size={props.size}
        />
      </Reveal>
    );
  } else {
    return (
      <MediaElement
        mime={`${type}/${extension}`}
        url={url.toString()}
        onMediaClick={props.onMediaClick}
        meta={props.meta}
        size={props.size}
      />
    );
  }
}
