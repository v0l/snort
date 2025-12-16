import "./ZapstrEmbed.css";

import { type NostrEvent, NostrLink } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { ProxyImg } from "@/Components/ProxyImg";
import ProfileImage from "@/Components/User/ProfileImage";

export default function ZapstrEmbed({ ev }: { ev: NostrEvent }) {
  const media = ev.tags.find(a => a[0] === "media");
  const cover = ev.tags.find(a => a[0] === "cover");
  const subject = ev.tags.find(a => a[0] === "subject");
  const refPersons = ev.tags.filter(a => a[0] === "p");

  const link = NostrLink.fromEvent(ev).encode(CONFIG.eventLinkPrefix);
  return (
    <>
      <div className="flex mb-2.5 layer-1">
        <ProxyImg src={cover?.[1] ?? ""} size={100} className="mr-2.5" />
        <div className="flex flex-col">
          <div>
            <h3>{subject?.[1] ?? ""}</h3>
          </div>
          <audio src={media?.[1] ?? ""} controls={true} className="m-0 h-8" />
          <div className="zapstr">
            {refPersons.map(a => (
              <ProfileImage key={a[1]} pubkey={a[1]} subHeader={<>{a[2] ?? ""}</>} className="pfp" defaultNip=" " />
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
