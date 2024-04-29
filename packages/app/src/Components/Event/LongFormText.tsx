import "./LongFormText.css";

import { TaggedNostrEvent } from "@snort/system";
import classNames from "classnames";
import { CSSProperties, useCallback, useRef, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import Text from "@/Components/Text/Text";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useImgProxy from "@/Hooks/useImgProxy";
import { findTag } from "@/Utils";

import { Markdown } from "./Markdown";
import NoteFooter from "./Note/NoteFooter/NoteFooter";
import NoteTime from "./Note/NoteTime";

interface LongFormTextProps {
  ev: TaggedNostrEvent;
  isPreview: boolean;
  onClick?: () => void;
  truncate?: boolean;
}

const TEXT_TRUNCATE_LENGTH = 400;

export function LongFormText(props: LongFormTextProps) {
  const title = findTag(props.ev, "title");
  const summary = findTag(props.ev, "summary");
  const image = findTag(props.ev, "image");
  const { proxy } = useImgProxy();
  const [reading, setReading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const ToggleShowMore = () => (
    <a
      className="highlight cursor-pointer"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        setShowMore(!showMore);
      }}>
      {showMore ? <FormattedMessage defaultMessage="Show less" /> : <FormattedMessage defaultMessage="Show more" />}
    </a>
  );

  const shouldTruncate = props.truncate && props.ev.content.length > TEXT_TRUNCATE_LENGTH;
  const content = shouldTruncate && !showMore ? props.ev.content.slice(0, TEXT_TRUNCATE_LENGTH) : props.ev.content;

  function fullText() {
    return (
      <>
        <NoteFooter ev={props.ev} />
        <hr />
        <div className="flex g8">
          <div>
            <FormattedMessage
              defaultMessage="{n} mins to read"
              id="zm6qS1"
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
        {shouldTruncate && showMore && <ToggleShowMore />}
        <Markdown content={content} tags={props.ev.tags} ref={ref} />
        {shouldTruncate && !showMore && <ToggleShowMore />}
        <hr />
        <NoteFooter ev={props.ev} />
      </>
    );
  }

  return (
    <div
      className={classNames("long-form-note flex flex-col g16 p break-words", { "cursor-pointer": props.isPreview })}
      onClick={props.onClick}>
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
