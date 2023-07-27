import { FormattedMessage } from "react-intl";

import { FileExtensionRegex } from "Const";
import Reveal from "Element/Reveal";
import useLogin from "Hooks/useLogin";
import { MediaElement } from "Element/MediaElement";

interface RevealMediaProps {
  creator: string;
  link: string;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export default function RevealMedia(props: RevealMediaProps) {
  const login = useLogin();
  const { preferences: pref, follows, publicKey } = login;

  const hideNonFollows = pref.autoLoadMedia === "follows-only" && !follows.item.includes(props.creator);
  const isMine = props.creator === publicKey;
  const hideMedia = pref.autoLoadMedia === "none" || (!isMine && hideNonFollows);
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
      case "m3u8":
        return "video";
      default:
        return "unknown";
    }
  })();

  if (hideMedia) {
    return (
      <Reveal
        message={<FormattedMessage defaultMessage="Click to load content from {link}" values={{ link: hostname }} />}>
        <MediaElement mime={`${type}/${extension}`} url={url.toString()} onMediaClick={props.onMediaClick} />
      </Reveal>
    );
  } else {
    return <MediaElement mime={`${type}/${extension}`} url={url.toString()} onMediaClick={props.onMediaClick} />;
  }
}
