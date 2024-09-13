import { Bech32Regex } from "@snort/shared";
import { ReactNode } from "react";

import AppleMusicEmbed from "@/Components/Embed/AppleMusicEmbed";
import LinkPreview from "@/Components/Embed/LinkPreview";
import MagnetLink from "@/Components/Embed/MagnetLink";
import MixCloudEmbed from "@/Components/Embed/MixCloudEmbed";
import NostrLink from "@/Components/Embed/NostrLink";
import SoundCloudEmbed from "@/Components/Embed/SoundCloudEmded";
import SpotifyEmbed from "@/Components/Embed/SpotifyEmbed";
import TidalEmbed from "@/Components/Embed/TidalEmbed";
import TwitchEmbed from "@/Components/Embed/TwitchEmbed";
import WavlakeEmbed from "@/Components/Embed/WavlakeEmbed";
import YoutubeEmbed from "@/Components/Embed/YoutubeEmbed";
import { magnetURIDecode } from "@/Utils";
import {
  AppleMusicRegex,
  MixCloudRegex,
  SoundCloudRegex,
  SpotifyRegex,
  TidalRegex,
  TwitchRegex,
  WavlakeRegex,
  YoutubeUrlRegex,
} from "@/Utils/Const";

interface HypeTextProps {
  link: string;
  children?: ReactNode | Array<ReactNode> | null;
  depth?: number;
  showLinkPreview?: boolean;
}

export default function HyperText({ link, depth, showLinkPreview, children }: HypeTextProps) {
  const a = link;
  try {
    const url = new URL(a);

    let m = null;
    if (a.match(YoutubeUrlRegex)) {
      return <YoutubeEmbed link={a} />;
    } else if (a.match(TidalRegex)) {
      return <TidalEmbed link={a} />;
    } else if (a.match(SoundCloudRegex)) {
      return <SoundCloudEmbed link={a} />;
    } else if (a.match(MixCloudRegex)) {
      return <MixCloudEmbed link={a} />;
    } else if (a.match(SpotifyRegex)) {
      return <SpotifyEmbed link={a} />;
    } else if (a.match(TwitchRegex)) {
      return <TwitchEmbed link={a} />;
    } else if (a.match(AppleMusicRegex)) {
      return <AppleMusicEmbed link={a} />;
    } else if (a.match(WavlakeRegex)) {
      return <WavlakeEmbed link={a} />;
    } else if (url.protocol === "nostr:" || url.protocol === "web+nostr:") {
      return <NostrLink link={a} depth={depth} />;
    } else if (url.protocol === "magnet:") {
      const parsed = magnetURIDecode(a);
      if (parsed) {
        return <MagnetLink magnet={parsed} />;
      }
    } else if ((m = a.match(Bech32Regex)) != null) {
      return <NostrLink link={`nostr:${m[1]}`} depth={depth} />;
    } else if (showLinkPreview ?? true) {
      return <LinkPreview url={a} />;
    }
  } catch {
    // Ignore the error.
  }
  return (
    <a href={a} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
      {children ?? a}
    </a>
  );
}
