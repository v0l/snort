import { NostrPrefix } from "@snort/nostr";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { setRelays } from "State/Login";
import { parseNostrLink, unixNowMs, unwrap } from "Util";

export default function NostrLinkHandler() {
  const params = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const link = decodeURIComponent(params["*"] ?? "").toLowerCase();

  useEffect(() => {
    if (link.length > 0) {
      const nav = parseNostrLink(link);
      if (nav) {
        if ((nav.relays?.length ?? 0) > 0) {
          // todo: add as ephemerial connection
          dispatch(
            setRelays({
              relays: Object.fromEntries(unwrap(nav.relays).map(a => [a, { read: true, write: false }])),
              createdAt: unixNowMs(),
            })
          );
        }
        if (nav.type === NostrPrefix.Event || nav.type === NostrPrefix.Note || nav.type === NostrPrefix.Address) {
          navigate(`/e/${nav.encode()}`);
        } else if (nav.type === NostrPrefix.PublicKey || nav.type === NostrPrefix.Profile) {
          navigate(`/p/${nav.encode()}`);
        }
      }
    }
  }, [link]);

  return <>Could not handle {link}</>;
}
