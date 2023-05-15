import "./ZapstrEmbed.css";
import { Link } from "react-router-dom";
import { encodeTLV, NostrPrefix, RawEvent } from "@snort/nostr";

import { ProxyImg } from "Element/ProxyImg";
import ProfileImage from "Element/ProfileImage";
import { FormattedMessage } from "react-intl";

export default function ZapstrEmbed({ ev }: { ev: RawEvent }) {
  const media = ev.tags.find(a => a[0] === "media");
  const cover = ev.tags.find(a => a[0] === "cover");
  const subject = ev.tags.find(a => a[0] === "subject");
  const refPersons = ev.tags.filter(a => a[0] === "p");

  const link = encodeTLV(
    NostrPrefix.Address,
    ev.tags.find(a => a[0] === "d")?.[1] ?? "",
    undefined,
    ev.kind,
    ev.pubkey
  );
  return (
    <>
      <div className="flex zapstr mb10 card">
        <ProxyImg src={cover?.[1] ?? ""} size={100} />
        <div className="flex f-col">
          <div>
            <h3>{subject?.[1] ?? ""}</h3>
          </div>
          <audio src={media?.[1] ?? ""} controls={true} />
          <div>
            {refPersons.map(a => (
              <ProfileImage pubkey={a[1]} subHeader={<>{a[2] ?? ""}</>} className="" defaultNip=" " />
            ))}
          </div>
        </div>
      </div>
      <Link to={`https://zapstr.live/?track=${link}`} target="_blank">
        <button>
          <FormattedMessage defaultMessage="Open on Zapstr" />
        </button>
      </Link>
    </>
  );
}
