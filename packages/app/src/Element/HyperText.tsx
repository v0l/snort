import { TwitterTweetEmbed } from "react-twitter-embed";

import {
  YoutubeUrlRegex,
  TweetUrlRegex,
  TidalRegex,
  SoundCloudRegex,
  MixCloudRegex,
  SpotifyRegex,
  TwitchRegex,
  AppleMusicRegex,
  NostrNestsRegex,
  WavlakeRegex,
} from "Const";
import { magnetURIDecode } from "SnortUtils";
import SoundCloudEmbed from "Element/SoundCloudEmded";
import MixCloudEmbed from "Element/MixCloudEmbed";
import SpotifyEmbed from "Element/SpotifyEmbed";
import TidalEmbed from "Element/TidalEmbed";
import TwitchEmbed from "Element/TwitchEmbed";
import AppleMusicEmbed from "Element/AppleMusicEmbed";
import WavlakeEmbed from "Element/WavlakeEmbed";
import LinkPreview from "Element/LinkPreview";
import NostrLink from "Element/NostrLink";
import MagnetLink from "Element/MagnetLink";

interface HypeTextProps {
  link: string;
  depth?: number;
}

export default function HyperText({ link, depth }: HypeTextProps) {
  const a = link;
  try {
    const url = new URL(a);
    const youtubeId = YoutubeUrlRegex.test(a) && RegExp.$1;
    const tweetId = TweetUrlRegex.test(a) && RegExp.$2;
    const tidalId = TidalRegex.test(a) && RegExp.$1;
    const soundcloundId = SoundCloudRegex.test(a) && RegExp.$1;
    const mixcloudId = MixCloudRegex.test(a) && RegExp.$1;
    const isSpotifyLink = SpotifyRegex.test(a);
    const isTwitchLink = TwitchRegex.test(a);
    const isAppleMusicLink = AppleMusicRegex.test(a);
    const isNostrNestsLink = NostrNestsRegex.test(a);
    const isWavlakeLink = WavlakeRegex.test(a);
    if (tweetId) {
      return (
        <div className="tweet" key={tweetId}>
          <TwitterTweetEmbed tweetId={tweetId} />
        </div>
      );
    } else if (youtubeId) {
      return (
        <iframe
          className="w-max"
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube video player"
          key={youtubeId}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen={true}
        />
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
            {a}
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
    } else {
      return <LinkPreview url={a} />;
    }
  } catch {
    // Ignore the error.
  }
  return (
    <a href={a} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
      {a}
    </a>
  );
}
