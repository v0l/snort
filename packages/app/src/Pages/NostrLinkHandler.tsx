import { NostrPrefix, tryParseNostrLink } from "@snort/system";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useLocation, useParams } from "react-router-dom";

import Spinner from "Icons/Spinner";
import { getNip05PubKey } from "Pages/LoginPage";
import ProfilePage from "Pages/Profile/ProfilePage";
import { ThreadRoute } from "Element/Event/Thread";

export default function NostrLinkHandler() {
  const params = useParams();
  const { state } = useLocation();
  const [loading, setLoading] = useState(true);
  const [renderComponent, setRenderComponent] = useState<React.ReactNode>(null);

  const link = decodeURIComponent(params["*"] ?? "").toLowerCase();

  async function handleLink(link: string) {
    const nav = tryParseNostrLink(link);
    if (nav) {
      if (nav.type === NostrPrefix.Event || nav.type === NostrPrefix.Note || nav.type === NostrPrefix.Address) {
        setRenderComponent(<ThreadRoute id={nav.encode()} />); // Directly render ThreadRoute
      } else if (nav.type === NostrPrefix.PublicKey || nav.type === NostrPrefix.Profile) {
        const id = nav.encode();
        setRenderComponent(<ProfilePage key={id} id={id} state={state} />); // Directly render ProfilePage
      }
    } else {
      if (state) {
        setRenderComponent(<ProfilePage state={state} />); // Directly render ProfilePage from route state
      } else {
        try {
          const pubkey = await getNip05PubKey(`${link}@${CONFIG.nip05Domain}`);
          if (pubkey) {
            setRenderComponent(<ProfilePage id={pubkey} state={state} />); // Directly render ProfilePage
          }
        } catch {
          //ignored
        }
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
    <div className="flex items-center">
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
