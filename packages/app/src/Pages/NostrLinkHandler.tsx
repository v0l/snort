import { NostrPrefix } from "@snort/nostr";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function NostrLinkHandler() {
  const params = useParams();
  const navigate = useNavigate();
  const link = decodeURIComponent(params["*"] ?? "");

  useEffect(() => {
    if (link.length > 0) {
      const ls = link.split(":");
      const entity = ls[1];
      if (entity.startsWith(NostrPrefix.PublicKey) || entity.startsWith(NostrPrefix.Profile)) {
        navigate(`/p/${entity}`);
      } else if (entity.startsWith(NostrPrefix.Event) || entity.startsWith(NostrPrefix.Note)) {
        navigate(`/e/${entity}`);
      }
    }
  }, [link]);

  return <>Could not handle {link}</>;
}
