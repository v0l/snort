import { NostrPrefix, tryParseNostrLink } from "@snort/system";
import { useEffect, useState } from "react";
import FormattedMessage from "Element/FormattedMessage";
import { useParams } from "react-router-dom";

import Spinner from "Icons/Spinner";
import { getNip05PubKey } from "Pages/LoginPage";
import ProfilePage from "Pages/Profile/ProfilePage";
import { ThreadRoute } from "Element/Event/Thread";

export default function NostrLinkHandler() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [renderComponent, setRenderComponent] = useState<React.ReactNode | null>(null);

  const link = decodeURIComponent(params["*"] ?? "").toLowerCase();

  async function handleLink(link: string) {
    const nav = tryParseNostrLink(link);
    if (nav) {
      if (nav.type === NostrPrefix.Event || nav.type === NostrPrefix.Note || nav.type === NostrPrefix.Address) {
        setRenderComponent(<ThreadRoute id={nav.encode()} />); // Directly render ThreadRoute
      } else if (nav.type === NostrPrefix.PublicKey || nav.type === NostrPrefix.Profile) {
        setRenderComponent(<ProfilePage id={nav.encode()} />); // Directly render ProfilePage
      }
    } else {
      try {
        const pubkey = await getNip05PubKey(`${link}@${process.env.NIP05_DOMAIN}`);
        if (pubkey) {
          setRenderComponent(<ProfilePage id={pubkey} />); // Directly render ProfilePage
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

  if (renderComponent) {
    return renderComponent;
  }

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
