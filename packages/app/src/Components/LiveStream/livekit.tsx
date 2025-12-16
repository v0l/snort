/* eslint-disable max-lines */
import {
  LiveKitRoom as LiveKitRoomContext,
  RoomAudioRenderer,
  useEnsureRoom,
  useParticipantPermissions,
  useParticipants,
} from "@livekit/components-react";
import { unixNow } from "@snort/shared";
import {
  EventKind,
  type EventPublisher,
  Nip10,
  NostrLink,
  RequestBuilder,
  type SystemInterface,
  type TaggedNostrEvent,
} from "@snort/system";
import { useRequestBuilder, useUserProfile } from "@snort/system-react";
import classNames from "classnames";
import { LocalParticipant, type LocalTrackPublication, type RemoteParticipant, RoomEvent, Track } from "livekit-client";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import Text from "@/Components/Text/Text";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { extractStreamInfo } from "@/Utils/stream";

import AsyncButton from "../Button/AsyncButton";
import IconButton from "../Button/IconButton";
import { ProxyImg } from "../ProxyImg";
import Avatar from "../User/Avatar";
import DisplayName from "../User/DisplayName";
import ProfileImage from "../User/ProfileImage";
import { NestsParticipants } from "./nests-participants";
import VuBar from "./VU";

enum RoomTab {
  Participants,
  Chat,
}

export default function LiveKitRoom({ ev, canJoin }: { ev: TaggedNostrEvent; canJoin?: boolean }) {
  const { stream, service, id } = extractStreamInfo(ev);
  const { publisher, system } = useEventPublisher();
  const [join, setJoin] = useState(false);
  const [token, setToken] = useState<string>();
  const [tab, setTab] = useState(RoomTab.Participants);

  async function getToken() {
    if (!service || !publisher) return;
    const url = `${service}/api/v1/nests/${id}`;
    const auth = await publisher.generic(eb => {
      eb.kind(EventKind.HttpAuthentication);
      eb.tag(["url", url]);
      eb.tag(["u", url]);
      eb.tag(["method", "GET"]);
      return eb;
    });
    const rsp = await fetch(url, {
      headers: {
        authorization: `Nostr ${window.btoa(JSON.stringify(auth))}`,
      },
    });

    const text = await rsp.text();
    if (rsp.ok) {
      return JSON.parse(text) as { token: string };
    }
  }

  async function publishPresence(publisher: EventPublisher, system: SystemInterface) {
    const e = await publisher.generic(eb => {
      const link = NostrLink.fromEvent(ev);
      return eb
        .kind(10_312 as EventKind)
        .tag(Nip10.linkToTag(link))
        .tag(["expiration", (unixNow() + 60).toString()]);
    });
    await system.BroadcastEvent(e);
  }

  useEffect(() => {
    if (join && !token) {
      getToken()
        .then(t => setToken(t?.token))
        .catch(console.error);
    }
  }, [join]);

  useEffect(() => {
    if (token && publisher && system) {
      publishPresence(publisher, system);
      const t = setInterval(async () => {
        if (token) {
          publishPresence(publisher, system);
        }
      }, 60_000);
      return () => clearInterval(t);
    }
  }, [token, publisher, system]);

  if (!join) {
    return (
      <div className="px-3 py-2 flex flex-col gap-2">
        <RoomHeader ev={ev} />
        {(canJoin ?? false) && (
          <AsyncButton onClick={() => setJoin(true)}>
            <FormattedMessage defaultMessage="Join Room" />
          </AsyncButton>
        )}
      </div>
    );
  }
  return (
    <LiveKitRoomContext token={token} serverUrl={stream?.replace("wss+livekit://", "wss://")} connect={true}>
      <RoomAudioRenderer volume={1} muted={false} />
      <RoomBody ev={ev} tab={tab} onSelectTab={setTab} />
    </LiveKitRoomContext>
  );
}

function RoomHeader({ ev }: { ev: TaggedNostrEvent }) {
  const { image, title } = extractStreamInfo(ev);
  return (
    <div className="relative rounded-lg h-[140px] w-full overflow-hidden">
      {image ? (
        <ProxyImg src={image} className="w-full h-full object-cover object-center" />
      ) : (
        <div className="absolute bg-neutral-800 w-full h-full" />
      )}
      <div className="absolute left-4 top-4 w-full flex justify-between pr-8">
        <div className="text-2xl">{title}</div>
        <div className="flex gap-2 items-center">
          <NestsParticipants ev={ev} />
        </div>
      </div>
    </div>
  );
}

function RoomBody({ ev, tab, onSelectTab }: { ev: TaggedNostrEvent; tab: RoomTab; onSelectTab: (t: RoomTab) => void }) {
  const participants = useParticipants({
    updateOnlyOn: [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.ParticipantPermissionsChanged,
      RoomEvent.TrackMuted,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnmuted,
      RoomEvent.TrackUnmuted,
    ],
  });
  return (
    <div className="px-3 py-2">
      <RoomHeader ev={ev} />
      <MyControls />
      <div className="flex text-center items-center text-xl font-medium mb-2">
        <div
          className={classNames("flex-1 py-2 cursor-pointer select-none border-b border-transparent", {
            "!border-highlight": tab === RoomTab.Participants,
          })}
          onClick={() => onSelectTab(RoomTab.Participants)}>
          <FormattedMessage defaultMessage="Participants" />
        </div>
        <div
          className={classNames("flex-1 py-2 cursor-pointer select-none border-b border-transparent", {
            "!border-highlight": tab === RoomTab.Chat,
          })}
          onClick={() => onSelectTab(RoomTab.Chat)}>
          <FormattedMessage defaultMessage="Chat" />
        </div>
      </div>
      {tab === RoomTab.Participants && (
        <div className="grid grid-cols-4">
          {participants.map(a => (
            <LiveKitUser p={a} key={a.identity} />
          ))}
        </div>
      )}
      {tab === RoomTab.Chat && (
        <>
          <RoomChat ev={ev} />
          <WriteChatMessage ev={ev} />
        </>
      )}
    </div>
  );
}

function MyControls() {
  const room = useEnsureRoom();
  const p = room.localParticipant;
  const permissions = useParticipantPermissions({
    participant: p,
  });
  useEffect(() => {
    if (permissions && p instanceof LocalParticipant) {
      const handler = (lt: LocalTrackPublication) => {
        lt.mute();
      };
      p.on("localTrackPublished", handler);
      if (permissions.canPublish && p.audioTrackPublications.size === 0) {
        p.setMicrophoneEnabled(true);
      }
      return () => {
        p.off("localTrackPublished", handler);
      };
    }
  }, [p, permissions]);
  const isMuted = p.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true;

  return (
    <div className="flex gap-2 items-center mt-2">
      {p.permissions?.canPublish && (
        <IconButton
          icon={{ name: !isMuted ? "mic" : "mic-off", size: 20 }}
          onClick={async () => {
            if (isMuted) {
              await p.setMicrophoneEnabled(true);
            } else {
              await p.setMicrophoneEnabled(false);
            }
          }}
        />
      )}
      {/*<IconButton icon={{ name: "hand", size: 20 }} />*/}
    </div>
  );
}

function RoomChat({ ev }: { ev: TaggedNostrEvent }) {
  const link = NostrLink.fromEvent(ev);
  const sub = useMemo(() => {
    const sub = new RequestBuilder(`room-chat:${link.tagKey}`);
    sub.withOptions({ leaveOpen: true, replaceable: true });
    sub.withFilter().replyToLink([link]).kinds([EventKind.LiveEventChat]).limit(100);
    return sub;
  }, [link.tagKey]);
  const chat = useRequestBuilder(sub);

  return (
    <div className="flex h-[calc(100dvh-370px)] overflow-x-hidden overflow-y-scroll">
      <div className="flex flex-col gap-1 flex-col-reverse w-full">
        {chat
          .sort((a, b) => b.created_at - a.created_at)
          .map(e => (
            <ChatMessage key={e.id} ev={e} />
          ))}
      </div>
    </div>
  );
}

function ChatMessage({ ev }: { ev: TaggedNostrEvent }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2">
      <ProfileImage pubkey={ev.pubkey} size={20} showFollowDistance={false} className="text-highlight" />
      <Text id={ev.id} content={ev.content} creator={ev.pubkey} tags={ev.tags} disableMedia={true} />
    </div>
  );
}

function WriteChatMessage({ ev }: { ev: TaggedNostrEvent }) {
  const link = NostrLink.fromEvent(ev);
  const [chat, setChat] = useState("");
  const { publisher, system } = useEventPublisher();
  const { formatMessage } = useIntl();

  async function sendMessage() {
    if (!publisher || !system || chat.length < 2) return;
    const eChat = await publisher.generic(eb => eb.kind(EventKind.LiveEventChat).tag(link.toEventTag()!).content(chat));
    await system.BroadcastEvent(eChat);
    setChat("");
  }

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={chat}
        placeholder={formatMessage({ defaultMessage: "Write message" })}
        onChange={e => setChat(e.target.value)}
        className="grow"
        onKeyDown={e => {
          if (e.key === "Enter") {
            sendMessage();
          }
        }}
      />
      <IconButton icon={{ name: "arrow-right" }} onClick={sendMessage} />
    </div>
  );
}

function LiveKitUser({ p }: { p: RemoteParticipant | LocalParticipant }) {
  const pubkey = p.identity.startsWith("guest-") ? "anon" : p.identity;
  const profile = useUserProfile(pubkey);
  const mic = p.getTrackPublication(Track.Source.Microphone);

  return (
    <div className="flex flex-col gap-2 items-center text-center">
      <div className="relative w-[45px] h-[45px] flex items-center justify-center rounded-full overflow-hidden">
        {mic?.audioTrack?.mediaStreamTrack && (
          <VuBar track={mic.audioTrack?.mediaStreamTrack} className="absolute h-full w-full" />
        )}
        <Avatar pubkey={pubkey} user={profile} size={40} className="absolute" />
      </div>
      <div>
        <DisplayName pubkey={pubkey} user={pubkey === "anon" ? { name: "Anon" } : profile} />
        {p.permissions?.canPublish && <div className="text-highlight">Speaker</div>}
      </div>
    </div>
  );
}
