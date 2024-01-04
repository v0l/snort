import { NostrEvent, NostrLink } from "@snort/system";
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

  function statusLine() {
    switch (status) {
      case "live": {
        return (
          <div className="flex g4 items-center">
            <Icon name="signal-01" />
            <b className="uppercase">
              <FormattedMessage defaultMessage="Live" id="Dn82AL" />
            </b>
          </div>
        );
      }
      case "ended": {
        return (
          <b className="uppercase">
            <FormattedMessage defaultMessage="Ended" id="TP/cMX" />
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
          <Link to={link} target="_blank">
            <button className="nowrap">
              <FormattedMessage defaultMessage="Join Stream" id="GQPtfk" />
            </button>
          </Link>
        );
      }
      case "ended": {
        if (findTag(ev, "recording")) {
          return (
            <Link to={link} target="_blank">
              <button className="nowrap">
                <FormattedMessage defaultMessage="Watch Replay" id="6/hB3S" />
              </button>
            </Link>
          );
        }
      }
    }
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
