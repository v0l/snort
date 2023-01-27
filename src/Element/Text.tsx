import './Text.css'
import { useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { visit, SKIP } from "unist-util-visit";
import { TwitterTweetEmbed } from "react-twitter-embed";

import { UrlRegex, FileExtensionRegex, MentionRegex, InvoiceRegex, YoutubeUrlRegex, TweetUrlRegex, HashtagRegex, TidalRegex, SoundCloudRegex, MixCloudRegex } from "Const";
import { eventLink, hexToBech32 } from "Util";
import Invoice from "Element/Invoice";
import Hashtag from "Element/Hashtag";

import Tag from "Nostr/Tag";
import { MetadataCache } from "Db/User";
import Mention from "Element/Mention";
import TidalEmbed from "Element/TidalEmbed";
import { useSelector } from 'react-redux';
import { RootState } from 'State/Store';
import { UserPreferences } from 'State/Login';
import  SoundCloudEmbed from 'Element/SoundCloudEmded'
import MixCloudEmbed from './MixCloudEmbed';

function transformHttpLink(a: string, pref: UserPreferences) {
    try {
        if (!pref.autoLoadMedia) {
            return <a href={a} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">{a}</a>
        }
        const url = new URL(a);
        const youtubeId = YoutubeUrlRegex.test(a) && RegExp.$1;
        const tweetId = TweetUrlRegex.test(a) && RegExp.$2;
        const tidalId = TidalRegex.test(a) && RegExp.$1;
        const soundcloundId = SoundCloudRegex.test(a) && RegExp.$1;
        const mixcloudId = MixCloudRegex.test(a) && RegExp.$1;
        const extension = FileExtensionRegex.test(url.pathname.toLowerCase()) && RegExp.$1;
        if (extension) {
            switch (extension) {
                case "gif":
                case "jpg":
                case "jpeg":
                case "png":
                case "bmp":
                case "webp": {
                    return <img key={url.toString()} src={url.toString()} />;
                }
                case "wav":
                case "mp3":
                case "ogg": {
                    return <audio key={url.toString()} src={url.toString()} controls />
                }
                case "mp4":
                case "mov":
                case "mkv":
                case "avi":
                case "m4v": {
                    return <video key={url.toString()} src={url.toString()} controls />
                }
                default:
                    return <a key={url.toString()} href={url.toString()} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">{url.toString()}</a>
            }
        } else if (tweetId) {
            return (
                <div className="tweet" key={tweetId}>
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
                        key={youtubeId}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen={true}
                    />
                    <br />
                </>
            )
        } else if (tidalId) {
            return <TidalEmbed link={a} />
        } else if (soundcloundId){
            return <SoundCloudEmbed link={a} />
        } else if (mixcloudId){
            return <MixCloudEmbed link={a} />
        } else {
            return <a href={a} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">{a}</a>
        }
    } catch (error) {
    }
    return <a href={a} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">{a}</a>
}

function extractLinks(fragments: Fragment[], pref: UserPreferences) {
    return fragments.map(f => {
        if (typeof f === "string") {
            return f.split(UrlRegex).map(a => {
                if (a.startsWith("http")) {
                    return transformHttpLink(a, pref)
                }
                return a;
            });
        }
        return f;
    }).flat();
}

function extractMentions(frag: TextFragment) {
    return frag.body.map(f => {
        if (typeof f === "string") {
            return f.split(MentionRegex).map((match) => {
                let matchTag = match.match(/#\[(\d+)\]/);
                if (matchTag && matchTag.length === 2) {
                    let idx = parseInt(matchTag[1]);
                    let ref = frag.tags?.find(a => a.Index === idx);
                    if (ref) {
                        switch (ref.Key) {
                            case "p": {
                                return <Mention pubkey={ref.PubKey!} />
                            }
                            case "e": {
                                let eText = hexToBech32("note", ref.Event!).substring(0, 12);
                                return <Link key={ref.Event} to={eventLink(ref.Event!)} onClick={(e) => e.stopPropagation()}>#{eText}</Link>;
                            }
                            case "t": {
                                return <Hashtag tag={ref.Hashtag!} />
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

function extractInvoices(fragments: Fragment[]) {
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

function extractHashtags(fragments: Fragment[]) {
    return fragments.map(f => {
        if (typeof f === "string") {
            return f.split(HashtagRegex).map(i => {
                if (i.toLowerCase().startsWith("#")) {
                    return <Hashtag tag={i.substring(1)} />
                } else {
                    return i;
                }
            });
        }
        return f;
    }).flat();
}

function transformLi(frag: TextFragment) {
    let fragments = transformText(frag)
    return <li>{fragments}</li>
}

function transformParagraph(frag: TextFragment) {
    const fragments = transformText(frag)
    if (fragments.every(f => typeof f === 'string')) {
        return <p>{fragments}</p>
    }
    return <>{fragments}</>
}

function transformText(frag: TextFragment) {
    if (frag.body === undefined) {
        debugger;
    }
    let fragments = extractMentions(frag);
    fragments = extractLinks(fragments, frag.pref);
    fragments = extractInvoices(fragments);
    fragments = extractHashtags(fragments);
    return fragments;
}

export type Fragment = string | JSX.Element;

export interface TextFragment {
    body: Fragment[],
    tags: Tag[],
    users: Map<string, MetadataCache>,
    pref: UserPreferences
}

export interface TextProps {
    content: string,
    tags: Tag[],
    users: Map<string, MetadataCache>
}

export default function Text({ content, tags, users }: TextProps) {
    const pref = useSelector<RootState, UserPreferences>(s => s.login.preferences);
    const components = useMemo(() => {
        return {
            p: (x: any) => transformParagraph({ body: x.children ?? [], tags, users, pref }),
            a: (x: any) => transformHttpLink(x.href, pref),
            li: (x: any) => transformLi({ body: x.children ?? [], tags, users, pref }),
        };
    }, [content]);
    const disableMarkdownLinks = useCallback(() => (tree: any) => {
        visit(tree, (node, index, parent) => {
            if (
                parent &&
                typeof index === 'number' &&
                (node.type === 'link' ||
                  node.type === 'linkReference' ||
                  node.type === 'image' ||
                  node.type === 'imageReference' ||
                  node.type === 'definition')
            ) {
                  node.type = 'text';
                  node.value = content.slice(node.position.start.offset, node.position.end.offset).replace(/\)$/, ' )');
                  return SKIP;
            }
        })
    }, [content]);
    return <ReactMarkdown
        className="text"
        components={components}
        remarkPlugins={[disableMarkdownLinks]}
    >{content}</ReactMarkdown>
}
