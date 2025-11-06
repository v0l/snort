import { ReactNode } from "react";

import AppleMusicEmbed from "@/Components/Embed/AppleMusicEmbed";
import LinkPreview from "@/Components/Embed/LinkPreview";
import MixCloudEmbed from "@/Components/Embed/MixCloudEmbed";
import SoundCloudEmbed from "@/Components/Embed/SoundCloudEmded";
import SpotifyEmbed from "@/Components/Embed/SpotifyEmbed";
import TidalEmbed from "@/Components/Embed/TidalEmbed";
import TwitchEmbed from "@/Components/Embed/TwitchEmbed";
import WavlakeEmbed from "@/Components/Embed/WavlakeEmbed";
import YoutubeEmbed from "@/Components/Embed/YoutubeEmbed";
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
  showLinkPreview?: boolean;
}

export default function HyperText({ link, showLinkPreview, children }: HypeTextProps) {
  if (link.match(YoutubeUrlRegex)) {
    return <YoutubeEmbed link={link} />;
  } else if (link.match(TidalRegex)) {
    return <TidalEmbed link={link} />;
  } else if (link.match(SoundCloudRegex)) {
    return <SoundCloudEmbed link={link} />;
  } else if (link.match(MixCloudRegex)) {
    return <MixCloudEmbed link={link} />;
  } else if (link.match(SpotifyRegex)) {
    return <SpotifyEmbed link={link} />;
  } else if (link.match(TwitchRegex)) {
    return <TwitchEmbed link={link} />;
  } else if (link.match(AppleMusicRegex)) {
    return <AppleMusicEmbed link={link} />;
  } else if (link.match(WavlakeRegex)) {
    return <WavlakeEmbed link={link} />;
  } else if (showLinkPreview ?? true) {
    return <LinkPreview url={link} />;
  }
  return (
    <a
      href={link}
      onClick={e => e.stopPropagation()}
      target="_blank"
      rel="noreferrer"
      className="text-highlight no-underline hover:underline">
      {children ?? link}
    </a>
  );
}
