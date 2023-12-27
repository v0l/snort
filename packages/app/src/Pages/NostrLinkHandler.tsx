import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { fetchNip05Pubkey } from "@snort/shared";
import Spinner from "@/Icons/Spinner";
import ProfilePage from "@/Pages/Profile/ProfilePage";
import { ThreadRoute } from "@/Element/Event/Thread";
import { GenericFeed } from "@/Element/Feed/Generic";
import { NostrPrefix, tryParseNostrLink } from "@snort/system";
import { FormattedMessage } from "react-intl";

export default function NostrLinkHandler() {
  const { state } = useLocation();
  const { link } = useParams();

  const determineInitialComponent = (link) => {
    const nav = tryParseNostrLink(link);
    if (nav) {
      switch (nav.type) {
        case NostrPrefix.Event:
        case NostrPrefix.Note:
        case NostrPrefix.Address:
          return <ThreadRoute key={link} id={nav.encode()} />;
        case NostrPrefix.PublicKey:
        case NostrPrefix.Profile:
          return <ProfilePage key={link} id={nav.encode()} state={state} />;
        case NostrPrefix.Req:
          return <GenericFeed key={link} link={nav} />;
        default:
          return null;
      }
    } else {
      return state ? <ProfilePage key={link} state={state} /> : null;
    }
  };

  const initialRenderComponent = determineInitialComponent(link);
  const [loading, setLoading] = useState(initialRenderComponent ? false : true);
  const [renderComponent, setRenderComponent] = useState(initialRenderComponent);

  async function handleLink(link) {
    if (!tryParseNostrLink(link)) {
      try {
        const pubkey = await fetchNip05Pubkey(link, CONFIG.nip05Domain);
        if (pubkey) {
          setRenderComponent(<ProfilePage key={link} id={pubkey} state={state} />);
        }
      } catch {
        // Ignored
      }
      setLoading(false);
    }
  }

  useEffect(() => {
    setRenderComponent(determineInitialComponent(link));
    handleLink(link);
  }, [link]); // Depend only on 'link'

  if (renderComponent) {
    return renderComponent;
  }

  return (
    <div className="flex items-center">
      {loading ? (
        <Spinner width={50} height={50} />
      ) : (
        <b className="error">
          <FormattedMessage defaultMessage="Nothing found :/" id="oJ+JJN" />
        </b>
      )}
    </div>
  );
}
