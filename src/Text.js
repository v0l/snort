import { Link } from "react-router-dom";
import { TwitterTweetEmbed } from "react-twitter-embed";

import Invoice from "./element/Invoice";
import { UrlRegex, FileExtensionRegex, MentionRegex, InvoiceRegex, YoutubeUrlRegex, TweetUrlRegex, HashtagRegex } from "./Const";
import { eventLink, hexToBech32, profileLink } from "./Util";
import LazyImage from "./element/LazyImage";
import Hashtag from "./element/Hashtag";
import { useMemo } from "react";

function transformHttpLink(a) {
    try {
        const url = new URL(a);
        const youtubeId = YoutubeUrlRegex.test(a) && RegExp.$1;
        const tweetId = TweetUrlRegex.test(a) && RegExp.$2;
        const extension = FileExtensionRegex.test(url.pathname.toLowerCase()) && RegExp.$1;
        if (extension) {
            switch (extension) {
                case "gif":
                case "jpg":
                case "jpeg":
                case "png":
                case "bmp":
                case "webp": {
                    return <LazyImage key={url} src={url} />;
                }
                case "mp4":
                case "mov":
                case "mkv":
                case "avi":
                case "m4v": {
                    return <video key={url} src={url} controls />
                }
                default:
                    return <a key={url} href={url} onClick={(e) => e.stopPropagation()}>{url.toString()}</a>
            }
        } else if (tweetId) {
          return (
            <div className="tweet">
              <TwitterTweetEmbed tweetId={tweetId} />
            </div>
          )
        } else if (youtubeId) {
            return (
                <>
                    <br />
                    <iframe
                        className="w-max"
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen=""
                    />
                    <br />
                </>
            )
        } else {
            return <a key={url} href={url} onClick={(e) => e.stopPropagation()}>{url.toString()}</a>
        }
    } catch (e) {
        console.warn(`Not a valid url: ${a}`);
    }
}

export function extractLinks(fragments) {
    return fragments.map(f => {
        if (typeof f === "string") {
            return f.split(UrlRegex).map(a => {
                if (a.startsWith("http")) {
                    return transformHttpLink(a)
                }
                return a;
            });
        }
        return f;
    }).flat();
}

export function extractMentions(fragments, tags, users) {
    return fragments.map(f => {
        if (typeof f === "string") {
            return f.split(MentionRegex).map((match) => {
                let matchTag = match.match(/#\[(\d+)\]/);
                if (matchTag && matchTag.length === 2) {
                    let idx = parseInt(matchTag[1]);
                    let ref = tags.find(a => a.Index === idx);
                    if (ref) {
                        switch (ref.Key) {
                            case "p": {
                                let pUser = users[ref.PubKey]?.name ?? hexToBech32("npub", ref.PubKey).substring(0, 12);
                                return <Link key={ref.PubKey} to={profileLink(ref.PubKey)} onClick={(e) => e.stopPropagation()}>@{pUser}</Link>;
                            }
                            case "e": {
                                let eText = hexToBech32("note", ref.Event).substring(0, 12);
                                return <Link key={ref.Event} to={eventLink(ref.Event)} onClick={(e) => e.stopPropagation()}>#{eText}</Link>;
                            }
                        }
                    }
                    return <b style={{ color: "var(--error)" }}>{matchTag[0]}?</b>;
                } else {
                    return match;
                }
            });
        }
        return f;
    }).flat();
}

export function extractInvoices(fragments) {
    return fragments.map(f => {
        if (typeof f === "string") {
            return f.split(InvoiceRegex).map(i => {
                if (i.toLowerCase().startsWith("lnbc")) {
                    return <Invoice key={i} invoice={i} />
                } else {
                    return i;
                }
            });
        }
        return f;
    }).flat();
}

export function extractHashtags(fragments) {
    return fragments.map(f => {
        if (typeof f === "string") {
            return f.split(HashtagRegex).map(i => {
                if (i.toLowerCase().startsWith("#")) {
                    return <Hashtag>{i}</Hashtag>
                } else {
                    return i;
                }
            });
        }
        return f;
    }).flat();
}

export default function Text({ content, transforms }) {
    const transformed = useMemo(() => {
        let fragments = [content];
        transforms?.forEach(a => {
            fragments = a(fragments);
        });
        fragments = extractLinks(fragments);
        fragments = extractInvoices(fragments);
        fragments = extractHashtags(fragments);

        return fragments;
    }, [content]);

    return transformed;
}