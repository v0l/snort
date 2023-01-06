import { Link } from "react-router-dom";

import Invoice from "./element/Invoice";
import { UrlRegex, FileExtensionRegex, MentionRegex, InvoiceRegex, YoutubeUrlRegex } from "./Const";
import { eventLink, profileLink } from "./Util";

function transformHttpLink(a) {
    try {
        const url = new URL(a);
        const vParam = url.searchParams.get('v')
        const youtubeId = YoutubeUrlRegex.test(a) && RegExp.$1
        const extension = FileExtensionRegex.test(url.pathname.toLowerCase()) && RegExp.$1
        if (extension) {
            switch (extension) {
                case "gif":
                case "jpg":
                case "jpeg":
                case "png":
                case "bmp":
                case "webp": {
                    return <img key={url} src={url} />;
                }
                case "mp4":
                case "mov":
                case "mkv":
                case "avi":
                case "m4v": {
                    return <video key={url} src={url} controls />
                }
              default:
                return <a key={url} href={url}>{url.toString()}</a>
            }
        } else if (youtubeId) {
            return (
              <>
                <br />
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title="YouTube video player"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen=""
                />
                <br />
              </>
            )
        } else {
            return <a key={url} href={url}>{url.toString()}</a>
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
                                let pUser = users[ref.PubKey]?.name ?? ref.PubKey.substring(0, 8);
                                return <Link key={ref.PubKey} to={profileLink(ref.PubKey)} onClick={(ev) => ev.stopPropagation()}>@{pUser}</Link>;
                            }
                            case "e": {
                                let eText = ref.Event.substring(0, 8);
                                return <Link key={ref.Event} to={eventLink(ref.Event)}>#{eText}</Link>;
                            }
                        }
                    }
                    return <b style={{ color: "red" }}>{matchTag[0]}?</b>;
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
