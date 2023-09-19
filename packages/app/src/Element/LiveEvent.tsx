import { NostrEvent, NostrLink } from "@snort/system";
import { findTag } from "SnortUtils";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

export function LiveEvent({ ev }: { ev: NostrEvent }) {
  const title = findTag(ev, "title");
  return (
    <div className="text">
      <div className="flex card">
        <div className="f-grow">
          <h3>{title}</h3>
        </div>
        <div>
          <Link to={`https://zap.stream/${NostrLink.fromEvent(ev).encode()}`}>
            <button className="primary" type="button">
              <FormattedMessage defaultMessage="Watch Live!" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
