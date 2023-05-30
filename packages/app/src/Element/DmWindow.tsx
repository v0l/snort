import "./DmWindow.css";
import { useEffect, useMemo, useRef } from "react";
import { TaggedRawEvent } from "System";

import ProfileImage from "Element/ProfileImage";
import DM from "Element/DM";
import { dmsForLogin, dmsInChat, isToSelf } from "Pages/MessagesPage";
import NoteToSelf from "Element/NoteToSelf";
import { useDmCache } from "Hooks/useDmsCache";
import useLogin from "Hooks/useLogin";
import WriteDm from "Element/WriteDm";
import { unwrap } from "SnortUtils";

export default function DmWindow({ id }: { id: string }) {
  const pubKey = useLogin().publicKey;
  const dmListRef = useRef<HTMLDivElement>(null);

  function resize(chatList: HTMLDivElement) {
    if (!chatList.parentElement) return;

    const scrollWrap = unwrap(chatList.parentElement);
    const h = scrollWrap.scrollHeight;
    const s = scrollWrap.clientHeight + scrollWrap.scrollTop;
    const pos = Math.abs(h - s);
    const atBottom = pos === 0;
    //console.debug("Resize", h, s, pos, atBottom);
    if (atBottom) {
      scrollWrap.scrollTo(0, scrollWrap.scrollHeight);
    }
  }

  useEffect(() => {
    if (dmListRef.current) {
      const scrollWrap = dmListRef.current;
      const chatList = unwrap(scrollWrap.parentElement);
      chatList.onscroll = () => {
        resize(dmListRef.current as HTMLDivElement);
      };
      new ResizeObserver(() => resize(dmListRef.current as HTMLDivElement)).observe(scrollWrap);
      return () => {
        chatList.onscroll = null;
        new ResizeObserver(() => resize(dmListRef.current as HTMLDivElement)).unobserve(scrollWrap);
      };
    }
  }, [dmListRef]);

  return (
    <div className="dm-window">
      <div>
        {(id === pubKey && <NoteToSelf className="f-grow mb-10" pubkey={id} />) || (
          <ProfileImage pubkey={id} className="f-grow mb10" />
        )}
      </div>
      <div>
        <div className="flex f-col" ref={dmListRef}>
          <DmChatSelected chatPubKey={id} />
        </div>
      </div>
      <div>
        <WriteDm chatPubKey={id} />
      </div>
    </div>
  );
}

function DmChatSelected({ chatPubKey }: { chatPubKey: string }) {
  const dms = useDmCache();
  const { publicKey: myPubKey } = useLogin();
  const sortedDms = useMemo(() => {
    if (myPubKey) {
      const myDms = dmsForLogin(dms, myPubKey);
      // filter dms in this chat, or dms to self
      const thisDms = myPubKey === chatPubKey ? myDms.filter(d => isToSelf(d, myPubKey)) : myDms;
      return [...dmsInChat(thisDms, chatPubKey)].sort((a, b) => a.created_at - b.created_at);
    }
    return [];
  }, [dms, myPubKey, chatPubKey]);

  return (
    <>
      {sortedDms.map(a => (
        <DM data={a as TaggedRawEvent} key={a.id} />
      ))}
    </>
  );
}
