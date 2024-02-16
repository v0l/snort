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
import { magnetURIDecode } from "@/Utils";
import {
  AppleMusicRegex,
  MixCloudRegex,
  NostrNestsRegex,
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
    const youtubeId = YoutubeUrlRegex.test(a) && RegExp.$1;
    const tidalId = TidalRegex.test(a) && RegExp.$1;
    const soundcloundId = SoundCloudRegex.test(a) && RegExp.$1;
    const mixcloudId = MixCloudRegex.test(a) && RegExp.$1;
    const isSpotifyLink = SpotifyRegex.test(a);
    const isTwitchLink = TwitchRegex.test(a);
    const isAppleMusicLink = AppleMusicRegex.test(a);
    const isNostrNestsLink = NostrNestsRegex.test(a);
    const isWavlakeLink = WavlakeRegex.test(a);

    if (youtubeId) {
      return (
        <>
          <iframe
            // eslint-disable-next-line react/no-unknown-property
            credentialless=""
            className="-mx-4 md:mx-0 w-max my-2"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="YouTube video player"
            key={youtubeId}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen={true}
          />
          <a href={a} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
            {a}
          </a>
        </>
      );
    } else if (tidalId) {
      return <TidalEmbed link={a} />;
    } else if (soundcloundId) {
      return <SoundCloudEmbed link={a} />;
    } else if (mixcloudId) {
      return <MixCloudEmbed link={a} />;
    } else if (isSpotifyLink) {
      return <SpotifyEmbed link={a} />;
    } else if (isTwitchLink) {
      return <TwitchEmbed link={a} />;
    } else if (isAppleMusicLink) {
      return <AppleMusicEmbed link={a} />;
    } else if (isNostrNestsLink) {
      return (
        <>
          <a href={a} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
            {children ?? a}
          </a>
          {/*<NostrNestsEmbed link={a} />,*/}
        </>
      );
    } else if (isWavlakeLink) {
      return <WavlakeEmbed link={a} />;
    } else if (url.protocol === "nostr:" || url.protocol === "web+nostr:") {
      return <NostrLink link={a} depth={depth} />;
    } else if (url.protocol === "magnet:") {
      const parsed = magnetURIDecode(a);
      if (parsed) {
        return <MagnetLink magnet={parsed} />;
      }
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
