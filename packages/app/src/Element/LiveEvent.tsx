import { NostrEvent, NostrPrefix, encodeTLV } from "@snort/system";
import { findTag, unwrap } from "SnortUtils";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

export function LiveEvent({ ev }: { ev: NostrEvent }) {
  const title = findTag(ev, "title");
  const d = unwrap(findTag(ev, "d"));
  return (
    <div className="text">
      <div className="flex card">
        <div className="f-grow">
          <h3>{title}</h3>
        </div>
        <div>
          <Link to={`/live/${encodeTLV(NostrPrefix.Address, d, undefined, ev.kind, ev.pubkey)}`}>
            <button className="primary" type="button">
              <FormattedMessage defaultMessage="Watch Live!" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
