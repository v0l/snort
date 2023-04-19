import "./ChatPage.css";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { TaggedRawEvent } from "@snort/nostr";

import ProfileImage from "Element/ProfileImage";
import { bech32ToHex } from "Util";
import useEventPublisher from "Feed/EventPublisher";
import DM from "Element/DM";
import { dmsForLogin, dmsInChat, isToSelf } from "Pages/MessagesPage";
import NoteToSelf from "Element/NoteToSelf";
import { useDmCache } from "Hooks/useDmsCache";
import useLogin from "Hooks/useLogin";

type RouterParams = {
  id: string;
};

export default function ChatPage() {
  const params = useParams<RouterParams>();
  const publisher = useEventPublisher();
  const id = bech32ToHex(params.id ?? "");
  const pubKey = useLogin().publicKey;
  const [content, setContent] = useState<string>();
  const dmListRef = useRef<HTMLDivElement>(null);
  const dms = useDmCache();

  const sortedDms = useMemo(() => {
    if (pubKey) {
      const myDms = dmsForLogin(dms, pubKey);
      // filter dms in this chat, or dms to self
      const thisDms = id === pubKey ? myDms.filter(d => isToSelf(d, pubKey)) : myDms;
      return [...dmsInChat(thisDms, id)].sort((a, b) => a.created_at - b.created_at);
    }
    return [];
  }, [dms, pubKey]);

  useEffect(() => {
    if (dmListRef.current) {
      dmListRef.current.scroll(0, dmListRef.current.scrollHeight);
    }
  }, [dmListRef.current?.scrollHeight]);

  async function sendDm() {
    if (content && publisher) {
      const ev = await publisher.sendDm(content, id);
      publisher.broadcast(ev);
      setContent("");
    }
  }

  async function onEnter(e: KeyboardEvent) {
    const isEnter = e.code === "Enter";
    if (isEnter && !e.shiftKey) {
      await sendDm();
    }
  }

  return (
    <>
      {(id === pubKey && <NoteToSelf className="f-grow mb-10" pubkey={id} />) || (
        <ProfileImage pubkey={id} className="f-grow mb10" />
      )}
      <div className="dm-list" ref={dmListRef}>
        <div>
          {sortedDms.map(a => (
            <DM data={a as TaggedRawEvent} key={a.id} />
          ))}
        </div>
      </div>
      <div className="write-dm">
        <div className="inner">
          <textarea
            className="f-grow mr10"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => onEnter(e)}></textarea>
          <button type="button" onClick={() => sendDm()}>
            <FormattedMessage defaultMessage="Send" description="Send DM button" />
          </button>
        </div>
      </div>
    </>
  );
}
