import { decodeTLV, NostrPrefix, TLVEntryType } from "@snort/nostr";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { setRelays } from "State/Login";
import { eventLink, profileLink } from "Util";

export default function NostrLinkHandler() {
  const params = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const link = decodeURIComponent(params["*"] ?? "").toLowerCase();

  useEffect(() => {
    if (link.length > 0) {
      const entity = link.startsWith("web+nostr:") ? link.split(":")[1] : link;
      if (entity.startsWith(NostrPrefix.PublicKey)) {
        navigate(`/p/${entity}`);
      } else if (entity.startsWith(NostrPrefix.Note)) {
        navigate(`/e/${entity}`);
      } else if (entity.startsWith(NostrPrefix.Profile) || entity.startsWith(NostrPrefix.Event)) {
        const decoded = decodeTLV(entity);
        console.debug(decoded);

        const id = decoded.find(a => a.type === TLVEntryType.Special)?.value as string;
        const relays = decoded.filter(a => a.type === TLVEntryType.Relay);
        if (relays.length > 0) {
          const relayObj = {
            relays: Object.fromEntries(relays.map(a => [a.value, { read: true, write: false }])),
            createdAt: new Date().getTime(),
          };
          dispatch(setRelays(relayObj));
        }

        if (entity.startsWith(NostrPrefix.Profile)) {
          navigate(profileLink(id));
        } else if (entity.startsWith(NostrPrefix.Event)) {
          navigate(eventLink(id));
        }
      }
    }
  }, [link]);

  return <>Could not handle {link}</>;
}
