import { NostrEvent, NostrLink } from "@snort/system";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import { findTag } from "@/Utils";

import ProfileImage from "../User/ProfileImage";

export function LiveEvent({ ev }: { ev: NostrEvent }) {
  const title = findTag(ev, "title");
  const status = findTag(ev, "status");
  const starts = Number(findTag(ev, "starts"));
  const host = ev.tags.find(a => a[0] === "p" && a[3] === "host")?.[1] ?? ev.pubkey;
  const [play, setPlay] = useState(false);

  function statusLine() {
    switch (status) {
      case "live": {
        return (
          <div className="flex g4 items-center">
            <Icon name="signal-01" />
            <b className="uppercase">
              <FormattedMessage defaultMessage="Live" />
            </b>
          </div>
        );
      }
      case "ended": {
        return (
          <b className="uppercase">
            <FormattedMessage defaultMessage="Ended" />
          </b>
        );
      }
      case "planned": {
        return (
          <b className="uppercase">
            {new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(
              new Date(starts * 1000),
            )}
          </b>
        );
      }
    }
  }

  function cta() {
    const link = `https://zap.stream/${NostrLink.fromEvent(ev).encode()}`;
    switch (status) {
      case "live": {
        return (
          <button className="nowrap" onClick={() => setPlay(true)}>
            <FormattedMessage defaultMessage="Watch Stream" />
          </button>
        );
      }
      case "ended": {
        if (findTag(ev, "recording")) {
          return (
            <Link to={link} target="_blank">
              <button className="nowrap">
                <FormattedMessage defaultMessage="Watch Replay" />
              </button>
            </Link>
          );
        }
      }
    }
  }
  if (play) {
    const link = `https://zap.stream/embed/${NostrLink.fromEvent(ev).encode()}`;
    return (
      <iframe
        // eslint-disable-next-line react/no-unknown-property
        credentialless=""
        src={link}
        width="100%"
        style={{
          aspectRatio: "16/9",
        }}
      />
    );
  }
  return (
    <div className="sm:flex g12 br p24 bg-primary items-center">
      <div>
        <ProfileImage pubkey={host} showUsername={false} size={56} />
      </div>
      <div className="flex flex-col g8 grow">
        <div className="font-semibold text-3xl">{title}</div>
        <div>{statusLine()}</div>
      </div>
      <div>{cta()}</div>
    </div>
  );
}
