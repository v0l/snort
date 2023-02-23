import "./Note.css";
import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { ZapsSummary } from "Element/Zap";
import Zap from "Icons/Zap";
import { ProxyImg } from "Element/ProxyImg";
import ProfileImage from "Element/ProfileImage";
import { Subthread } from "Element/Thread";
import Text from "Element/Text";
import Reactions from "Element/Reactions";
import File from "Icons/File";
import NoteTime from "Element/NoteTime";
import SendSats from "Element/SendSats";
import useLongFormThreadFeed from "Feed/LongFormThreadFeed";
import { useUserProfile } from "Feed/ProfileFeed";
import { HexKey, u256, TaggedRawEvent, Event as NEvent, EventKind } from "@snort/nostr";
import { eventLink, unwrap } from "Util";
import { RootState } from "State/Store";
import { formatShort } from "Number";

export interface LongFormNoteProps {
  className?: string;
  d: string;
  pubkey: HexKey;
  data?: TaggedRawEvent;
}

export default function LongFormNote(props: LongFormNoteProps) {
  const { data, d, pubkey } = props;
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [tip, setTip] = useState(false);
  const baseClassName = `note long-form-note thread-root card ${props.className ? props.className : ""}`;
  const ev = useMemo(() => new NEvent(data), [data]);
  const { notes, replies, zaps } = useLongFormThreadFeed(d, pubkey);
  const parsedNotes: NEvent[] = useMemo(() => notes.map((n: TaggedRawEvent) => new NEvent(n)), [notes]);
  const parsedReplies = useMemo(() => replies.map((n: TaggedRawEvent) => new NEvent(n)), [replies]);
  const author = useUserProfile(ev.RootPubKey);
  const title = ev.Tags.find(t => t.Key === "title")?.Original[1];
  const summary = ev.Tags.find(t => t.Key === "summary")?.Original[1];
  const image = ev.Tags.find(t => t.Key === "image")?.Original[1];
  const publishedAt = ev.Tags.find(t => t.Key === "published_at")?.Original[1];
  const login = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
  const zapTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  const didZap = zaps.some(a => a.zapper === login);
  const service = author?.lud16 || author?.lud06;

  const chains = useMemo(() => {
    const chains = new Map<u256, NEvent[]>();
    parsedNotes
      ?.filter(a => a.Kind === EventKind.TextNote)
      .sort((a, b) => b.CreatedAt - a.CreatedAt)
      .forEach(v => {
        const replyTo = v.Thread?.ReplyTo?.Event ?? v.Thread?.Root?.Event;
        if (replyTo) {
          if (!chains.has(replyTo)) {
            chains.set(replyTo, [v]);
          } else {
            unwrap(chains.get(replyTo)).push(v);
          }
        } else if (v.Tags.length > 0) {
          console.log("Not replying to anything: ", v);
        }
      });

    return chains;
  }, [parsedNotes]);

  function onNavigate(id: u256) {
    const reply = chains.get(id)?.at(0);
    if (reply) {
      navigate(eventLink(reply.Id));
    }
  }

  return (
    <div className="thread-container">
      <div key={ev.Id} className={`${baseClassName}`}>
        <div className="header">
          <ProfileImage autoWidth={false} pubkey={ev.PubKey} />
          <div className="info">
            <File />
            {publishedAt ? (
              <NoteTime from={Number(publishedAt) * 1000} />
            ) : (
              <NoteTime from={Number(ev.CreatedAt) * 1000} />
            )}
          </div>
        </div>
        <div className="body">
          <div className="text" dir="auto">
            <div className="heading">
              <h1>{title}</h1>
            </div>
            {summary && <blockquote className="summary">{summary}</blockquote>}
            {image && <ProxyImg alt={title} key={image} src={image} />}
            <Text longForm={true} content={ev.Content} tags={ev.Tags} users={new Map()} creator={ev.PubKey} />
          </div>
        </div>
        <div className="footer">
          <div className="footer-reactions">
            <div className={`reaction-pill ${didZap ? "reacted" : ""}`} onClick={() => setTip(true)}>
              <div className="reaction-pill-icon">
                <Zap />
              </div>
              {zapTotal > 0 && <div className="reaction-pill-number">{formatShort(zapTotal)}</div>}
            </div>
            <Reactions show={show} setShow={setShow} positive={[]} negative={[]} reposts={[]} zaps={zaps} />
          </div>
        </div>
        <div className="zaps-container">
          <ZapsSummary zaps={zaps} />
        </div>
      </div>
      <Subthread
        onNavigate={onNavigate}
        from=""
        active={""}
        path={[]}
        related={[]}
        chains={chains}
        notes={parsedReplies}
      />
      <SendSats
        svc={service}
        onClose={() => setTip(false)}
        show={tip}
        author={author?.pubkey}
        target={author?.display_name || author?.name}
        note={ev.Id}
        coordinates={`${EventKind.LongFormNote}:${pubkey}:${d}`}
      />
    </div>
  );
}
