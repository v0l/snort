import { NostrPrefix, tryParseNostrLink } from "@snort/system";
import { useEffect, useState } from "react";
import FormattedMessage from "@snort/app/src/Element/FormattedMessage";
import { useNavigate, useParams } from "react-router-dom";

import Spinner from "Icons/Spinner";
import { profileLink } from "SnortUtils";
import { getNip05PubKey } from "Pages/LoginPage";

export default function NostrLinkHandler() {
  const params = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const link = decodeURIComponent(params["*"] ?? "").toLowerCase();

  async function handleLink(link: string) {
    const nav = tryParseNostrLink(link);
    if (nav) {
      if (nav.type === NostrPrefix.Event || nav.type === NostrPrefix.Note || nav.type === NostrPrefix.Address) {
        navigate(`/e/${nav.encode()}`);
      } else if (nav.type === NostrPrefix.PublicKey || nav.type === NostrPrefix.Profile) {
        navigate(`/p/${nav.encode()}`);
      }
    } else {
      try {
        const pubkey = await getNip05PubKey(`${link}@${process.env.NIP05_DOMAIN}`);
        if (pubkey) {
          navigate(profileLink(pubkey));
        }
      } catch {
        //ignored
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (link.length > 0) {
      handleLink(link).catch(console.error);
    }
  }, [link]);

  return (
    <div className="flex f-center">
      {loading ? (
        <Spinner width={50} height={50} />
      ) : (
        <b className="error">
          <FormattedMessage defaultMessage="Nothing found :/" />
        </b>
      )}
    </div>
  );
}
