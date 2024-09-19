import { TaggedNostrEvent } from "@snort/system";

export function getHost(ev?: TaggedNostrEvent) {
    return ev?.tags.find(a => a[0] === "p" && a[3] === "host")?.[1] ?? ev?.pubkey ?? "";
}

export type StreamState = "live" | "ended" | "planned";

export interface StreamInfo {
    id?: string;
    title?: string;
    summary?: string;
    image?: string;
    thumbnail?: string;
    status?: StreamState;
    stream?: string;
    recording?: string;
    contentWarning?: string;
    tags: Array<string>;
    goal?: string;
    participants?: string;
    starts?: string;
    ends?: string;
    service?: string;
    host?: string;
    gameId?: string;
}

const gameTagFormat = /^[a-z-]+:[a-z0-9-]+$/i;
export function extractStreamInfo(ev?: TaggedNostrEvent) {
    const ret = {
        host: getHost(ev),
    } as StreamInfo;
    const matchTag = (tag: Array<string>, k: string, into: (v: string) => void) => {
        if (tag[0] === k) {
            into(tag[1]);
        }
    };

    for (const t of ev?.tags ?? []) {
        matchTag(t, "d", v => (ret.id = v));
        matchTag(t, "title", v => (ret.title = v));
        matchTag(t, "summary", v => (ret.summary = v));
        matchTag(t, "image", v => (ret.image = v));
        matchTag(t, "thumbnail", v => (ret.thumbnail = v));
        matchTag(t, "status", v => (ret.status = v as StreamState));
        if (t[0] === "streaming") {
            matchTag(t, "streaming", v => (ret.stream = v));
        }
        matchTag(t, "recording", v => (ret.recording = v));
        matchTag(t, "url", v => (ret.recording = v));
        matchTag(t, "content-warning", v => (ret.contentWarning = v));
        matchTag(t, "current_participants", v => (ret.participants = v));
        matchTag(t, "goal", v => (ret.goal = v));
        matchTag(t, "starts", v => (ret.starts = v));
        matchTag(t, "ends", v => (ret.ends = v));
        matchTag(t, "service", v => (ret.service = v));
    }
    const { regularTags } = sortStreamTags(ev?.tags ?? []);
    ret.tags = regularTags;

    return ret;
}


export function sortStreamTags(tags: Array<string | Array<string>>) {
    const plainTags = tags.filter(a => (Array.isArray(a) ? a[0] === "t" : true)).map(a => (Array.isArray(a) ? a[1] : a));

    const regularTags = plainTags.filter(a => !a.match(gameTagFormat)) ?? [];
    const prefixedTags = plainTags.filter(a => !regularTags.includes(a));
    return { regularTags, prefixedTags };
}