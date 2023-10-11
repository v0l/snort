import "./LongFormText.css";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { NostrLink, TaggedNostrEvent } from "@snort/system";

import { findTag } from "SnortUtils";
import Text from "Element/Text";
import { Markdown } from "./Markdown";
import useImgProxy from "Hooks/useImgProxy";
import { CSSProperties } from "react";
import ProfilePreview from "Element/User/ProfilePreview";
import NoteFooter from "./NoteFooter";
import { useEventReactions } from "Hooks/useEventReactions";
import NoteTime from "./NoteTime";

interface LongFormTextProps {
  ev: TaggedNostrEvent;
  isPreview: boolean;
  related: ReadonlyArray<TaggedNostrEvent>;
}

export function LongFormText(props: LongFormTextProps) {
  const title = findTag(props.ev, "title");
  const summary = findTag(props.ev, "summary");
  const image = findTag(props.ev, "image");
  const { proxy } = useImgProxy();
  const { reactions, reposts, zaps } = useEventReactions(props.ev, props.related);

  function previewText() {
    return (
      <>
        <Text
          id={props.ev.id}
          content={props.ev.content}
          tags={props.ev.tags}
          creator={props.ev.pubkey}
          truncate={props.isPreview ? 250 : undefined}
          disableLinkPreview={props.isPreview}
        />
        <Link to={`/e/${NostrLink.fromEvent(props.ev).encode()}`}>
          <FormattedMessage defaultMessage="Read full story" />
        </Link>
      </>
    );
  }

  function fullText() {
    return (
      <>
        <NoteFooter ev={props.ev} reposts={reposts} zaps={zaps} positive={reactions.positive} />
        <Markdown content={props.ev.content} tags={props.ev.tags} />
      </>
    );
  }

  return (
    <div className="long-form-note flex-column g16 p">
      <ProfilePreview
        pubkey={props.ev.pubkey}
        actions={
          <>
            <NoteTime from={props.ev.created_at * 1000} />
          </>
        }
        options={{
          about: false,
        }}
      />
      <h1>{title}</h1>
      <small>{summary}</small>
      {image && <div className="header-image" style={{ "--img": `url(${proxy(image)})` } as CSSProperties} />}
      {props.isPreview ? previewText() : fullText()}
    </div>
  );
}
