import { useCallback } from "react";
import { useSelector } from "react-redux";
import { TwitterTweetEmbed } from "react-twitter-embed";

import {
  FileExtensionRegex,
  YoutubeUrlRegex,
  TweetUrlRegex,
  TidalRegex,
  SoundCloudRegex,
  MixCloudRegex,
  SpotifyRegex,
  TwitchRegex,
  AppleMusicRegex,
} from "Const";
import { RootState } from "State/Store";
import SoundCloudEmbed from "Element/SoundCloudEmded";
import MixCloudEmbed from "Element/MixCloudEmbed";
import SpotifyEmbed from "Element/SpotifyEmbed";
import TidalEmbed from "Element/TidalEmbed";
import { ProxyImg } from "Element/ProxyImg";
import { HexKey } from "Nostr";
import TwitchEmbed from "./TwitchEmbed";
import AppleMusicEmbed from "./AppleMusicEmbed";

export default function HyperText({ link, creator }: { link: string; creator: HexKey }) {
  const pref = useSelector((s: RootState) => s.login.preferences);
  const follows = useSelector((s: RootState) => s.login.follows);
  const publicKey = useSelector((s: RootState) => s.login.publicKey);

  const render = useCallback(() => {
    const a = link;
    try {
      const hideNonFollows = pref.autoLoadMedia === "follows-only" && !follows.includes(creator);
      const isMine = creator === publicKey;
      if (pref.autoLoadMedia === "none" || (!isMine && hideNonFollows)) {
        return (
          <a href={a} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
            {a}
          </a>
        );
      }
      const url = new URL(a);
      const youtubeId = YoutubeUrlRegex.test(a) && RegExp.$1;
      const tweetId = TweetUrlRegex.test(a) && RegExp.$2;
      const tidalId = TidalRegex.test(a) && RegExp.$1;
      const soundcloundId = SoundCloudRegex.test(a) && RegExp.$1;
      const mixcloudId = MixCloudRegex.test(a) && RegExp.$1;
      const isSpotifyLink = SpotifyRegex.test(a);
      const isTwitchLink = TwitchRegex.test(a);
      const isAppleMusicLink = AppleMusicRegex.test(a);
      const extension = FileExtensionRegex.test(url.pathname.toLowerCase()) && RegExp.$1;
      if (extension && !isAppleMusicLink) {
        switch (extension) {
          case "gif":
          case "jpg":
          case "jpeg":
          case "png":
          case "bmp":
          case "webp": {
            return <ProxyImg key={url.toString()} src={url.toString()} />;
          }
          case "wav":
          case "mp3":
          case "ogg": {
            return <audio key={url.toString()} src={url.toString()} controls />;
          }
          case "mp4":
          case "mov":
          case "mkv":
          case "avi":
          case "m4v": {
            return <video key={url.toString()} src={url.toString()} controls />;
          }
          default:
            return (
              <a
                key={url.toString()}
                href={url.toString()}
                onClick={e => e.stopPropagation()}
                target="_blank"
                rel="noreferrer"
                className="ext">
                {url.toString()}
              </a>
            );
        }
      } else if (tweetId) {
        return (
          <div className="tweet" key={tweetId}>
            <TwitterTweetEmbed tweetId={tweetId} />
          </div>
        );
      } else if (youtubeId) {
        return (
          <>
            <br />
            <iframe
              className="w-max"
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="YouTube video player"
              key={youtubeId}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen={true}
            />
            <br />
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
      } else {
        return (
          <a href={a} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
            {a}
          </a>
        );
      }
    } catch (error) {
      // Ignore the error.
    }
    return (
      <a href={a} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
        {a}
      </a>
    );
  }, [link]);

  return render();
}
