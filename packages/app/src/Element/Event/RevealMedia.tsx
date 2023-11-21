import { FormattedMessage } from "react-intl";

import { FileExtensionRegex } from "@/Const";
import Reveal from "@/Element/Event/Reveal";
import useLogin from "@/Hooks/useLogin";
import { MediaElement } from "@/Element/Embed/MediaElement";
import { Link } from "react-router-dom";

interface RevealMediaProps {
  creator: string;
  link: string;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export default function RevealMedia(props: RevealMediaProps) {
  const { preferences, follows, publicKey } = useLogin(s => ({
    preferences: s.appData.item.preferences,
    follows: s.follows.item,
    publicKey: s.publicKey,
  }));

  const hideNonFollows = preferences.autoLoadMedia === "follows-only" && !follows.includes(props.creator);
  const isMine = props.creator === publicKey;
  const hideMedia = preferences.autoLoadMedia === "none" || (!isMine && hideNonFollows);
  const hostname = new URL(props.link).hostname;

  const url = new URL(props.link);
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
        <MediaElement mime={`${type}/${extension}`} url={url.toString()} onMediaClick={props.onMediaClick} />
      </Reveal>
    );
  } else {
    return <MediaElement mime={`${type}/${extension}`} url={url.toString()} onMediaClick={props.onMediaClick} />;
  }
}
