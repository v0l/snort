import { Link } from "react-router-dom";

import Invoice from "./element/Invoice";
import { UrlRegex, FileExtensionRegex, MentionRegex, InvoiceRegex } from "./Const";

export function extractLinks(fragments) {
    return fragments.map(f => {
        if (typeof f === "string") {
            return f.split(UrlRegex).map(a => {
                if (a.startsWith("http")) {
                    try {
                        let url = new URL(a);
                        let ext = url.pathname.toLowerCase().match(FileExtensionRegex);
                        if (ext) {
                            switch (ext[1]) {
                                case "gif":
                                case "jpg":
                                case "jpeg":
                                case "png":
                                case "bmp":
                                case "webp": {
                                    return <img key={url} src={url} />;
                                }
                                case "mp4":
                                case "mkv":
                                case "avi":
                                case "m4v": {
                                    return <video key={url} src={url} controls />
                                }
                            }
                        } else {
                            return <a key={url} href={url}>{url.toString()}</a>
                        }
                    } catch (e) {
                        console.warn(`Not a valid url: ${a}`);
                    }
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
                                return <Link key={ref.PubKey} to={`/p/${ref.PubKey}`}>@{pUser}</Link>;
                            }
                            case "e": {
                                let eText = ref.Event.substring(0, 8);
                                return <Link key={ref.Event} to={`/e/${ref.Event}`}>#{eText}</Link>;
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
