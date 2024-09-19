import { LiveKitRoom as LiveKitRoomContext, RoomAudioRenderer, useParticipants } from "@livekit/components-react";
import { dedupe, unixNow } from "@snort/shared";
import { EventKind, NostrLink, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { useRequestBuilder, useUserProfile } from "@snort/system-react";
import { LocalParticipant, RemoteParticipant } from "livekit-client";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

import useEventPublisher from "@/Hooks/useEventPublisher";
import { extractStreamInfo } from "@/Utils/stream";

import AsyncButton from "../Button/AsyncButton";
import { ProxyImg } from "../ProxyImg";
import Avatar from "../User/Avatar";
import { AvatarGroup } from "../User/AvatarGroup";
import DisplayName from "../User/DisplayName";

export default function LiveKitRoom({ ev, canJoin }: { ev: TaggedNostrEvent, canJoin?: boolean }) {
    const { stream, service, id } = extractStreamInfo(ev);
    const { publisher } = useEventPublisher();
    const [join, setJoin] = useState(false);
    const [token, setToken] = useState<string>();

    async function getToken() {
        if (!service || !publisher)
            return;
        const url = `${service}/api/v1/nests/${id}`;
        const auth = await publisher.generic(eb => {
            eb.kind(EventKind.HttpAuthentication);
            eb.tag(["url", url]);
            eb.tag(["u", url])
            eb.tag(["method", "GET"]);
            return eb;
        });
        const rsp = await fetch(url, {
            headers: {
                authorization: `Nostr ${window.btoa(JSON.stringify(auth))}`,
            }
        });

        const text = await rsp.text();
        if (rsp.ok) {
            return JSON.parse(text) as { token: string };
        }
    }

    useEffect(() => {
        if (join && !token) {
            getToken().then(t => setToken(t?.token)).catch(console.error);
        }
    }, [join]);

    if (!join) {
        return <div className="p flex flex-col gap-2">
            <RoomHeader ev={ev} />
            {(canJoin ?? false) && <AsyncButton onClick={() => setJoin(true)}>
                <FormattedMessage defaultMessage="Join Room" />
            </AsyncButton>}
        </div>
    }
    return <LiveKitRoomContext token={token} serverUrl={stream?.replace("wss+livekit://", "wss://")} connect={true}>
        <RoomAudioRenderer volume={1} />
        <ParticipantList ev={ev} />
    </LiveKitRoomContext>
}

function RoomHeader({ ev }: { ev: TaggedNostrEvent }) {
    const { image, title } = extractStreamInfo(ev);
    return <div className="relative rounded-xl h-[140px] w-full overflow-hidden">
        {image ? <ProxyImg src={image} className="w-full" /> :
            <div className="absolute bg-gray-dark w-full h-full" />}
        <div className="absolute left-4 top-4 w-full flex justify-between pr-4">
            <div className="text-2xl">
                {title}
            </div>
            <div>
                <NostrParticipants ev={ev} />
            </div>
        </div>

    </div>
}

function ParticipantList({ ev }: { ev: TaggedNostrEvent }) {
    const participants = useParticipants()
    return <div className="p">
        <RoomHeader ev={ev} />
        <h3>
            <FormattedMessage defaultMessage="Participants" />
        </h3>
        <div className="grid grid-cols-4">
            {participants.map(a => <LiveKitUser p={a} key={a.identity} />)}
        </div>

    </div>
}

function NostrParticipants({ ev }: { ev: TaggedNostrEvent }) {
    const link = NostrLink.fromEvent(ev);
    const sub = useMemo(() => {
        const sub = new RequestBuilder(`livekit-participants:${link.tagKey}`);
        sub.withFilter().replyToLink([link]).kinds([10_312 as EventKind]).since(unixNow() - 600);
        return sub;
    }, [link.tagKey]);

    const presense = useRequestBuilder(sub);
    return <AvatarGroup ids={dedupe(presense.map(a => a.pubkey))} size={32} />
}

function LiveKitUser({ p }: { p: RemoteParticipant | LocalParticipant }) {
    const pubkey = p.identity.startsWith("guest-") ? "anon" : p.identity
    const profile = useUserProfile(pubkey);
    return <div className="flex flex-col gap-2 items-center text-center">
        <Avatar pubkey={pubkey} className={p.isSpeaking ? "outline" : ""} user={profile} size={48} />
        <DisplayName pubkey={pubkey} user={pubkey === "anon" ? { name: "Anon" } : profile} />
    </div>
}