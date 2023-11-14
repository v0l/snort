import "./LongFormText.css";
import { CSSProperties, useCallback, useRef, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { useEventReactions } from "@snort/system-react";

import { findTag } from "SnortUtils";
import Text from "Element/Text";
import { Markdown } from "./Markdown";
import useImgProxy from "Hooks/useImgProxy";
import ProfilePreview from "Element/User/ProfilePreview";
import NoteFooter from "./NoteFooter";
import NoteTime from "./NoteTime";

interface LongFormTextProps {
  ev: TaggedNostrEvent;
  isPreview: boolean;
  related: ReadonlyArray<TaggedNostrEvent>;
  onClick?: () => void;
}

export function LongFormText(props: LongFormTextProps) {
  const title = findTag(props.ev, "title");
  const summary = findTag(props.ev, "summary");
  const image = findTag(props.ev, "image");
  const { proxy } = useImgProxy();
  const [reading, setReading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { reactions, reposts, zaps } = useEventReactions(NostrLink.fromEvent(props.ev), props.related);

  function previewText() {
    return (
      <Text
        id={props.ev.id}
        content={props.ev.content}
        tags={props.ev.tags}
        creator={props.ev.pubkey}
        truncate={props.isPreview ? 250 : undefined}
        disableLinkPreview={props.isPreview}
      />
    );
  }

  function readTime() {
    const wpm = 225;
    const words = props.ev.content.trim().split(/\s+/).length;
    return {
      words,
      wpm,
      mins: Math.ceil(words / wpm),
    };
  }

  const readAsync = async (text: string) => {
    return await new Promise<void>(resolve => {
      const ut = new SpeechSynthesisUtterance(text);
      ut.onend = () => {
        resolve();
      };
      window.speechSynthesis.speak(ut);
    });
  };

  const readArticle = useCallback(async () => {
    if (ref.current && !reading) {
      setReading(true);
      const paragraphs = ref.current.querySelectorAll("p,h1,h2,h3,h4,h5,h6");
      for (const p of paragraphs) {
        if (p.textContent) {
          p.classList.add("reading");
          await readAsync(p.textContent);
          p.classList.remove("reading");
        }
      }
      setReading(false);
    }
  }, [ref, reading]);

  const stopReading = () => {
    setReading(false);
    if (ref.current) {
      const paragraphs = ref.current.querySelectorAll("p,h1,h2,h3,h4,h5,h6");
      paragraphs.forEach(a => a.classList.remove("reading"));
      window.speechSynthesis.cancel();
    }
  };

  function fullText() {
    return (
      <>
        <NoteFooter ev={props.ev} reposts={reposts} zaps={zaps} positive={reactions.positive} />
        <hr />
        <div className="flex g8">
          <div>
            <FormattedMessage
              defaultMessage="{n} mins to read"
              values={{
                n: <FormattedNumber value={readTime().mins} />,
              }}
            />
          </div>
          <div>‧</div>
          {!reading && (
            <div className="pointer" onClick={() => readArticle()}>
              <FormattedMessage defaultMessage="Listen to this article" />
            </div>
          )}
          {reading && (
            <div className="pointer" onClick={() => stopReading()}>
              <FormattedMessage defaultMessage="Stop listening" />
            </div>
          )}
        </div>
        <hr />
        <Markdown content={props.ev.content} tags={props.ev.tags} ref={ref} />
        <hr />
        <NoteFooter ev={props.ev} reposts={reposts} zaps={zaps} positive={reactions.positive} />
      </>
    );
  }

  return (
    <div
      className="long-form-note flex flex-col g16 p pointer"
      onClick={e => {
        e.stopPropagation();
        props.onClick?.();
      }}>
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
