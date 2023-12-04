import { useLocation } from "react-router-dom";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { LogoHeader } from "@/Pages/Layout/LogoHeader";
import { rootTabItems, RootTabs } from "@/Element/Feed/RootTabs";
import NotificationsHeader from "@/Pages/Layout/NotificationsHeader";
import { NostrLink, NostrPrefix, parseNostrLink } from "@snort/system";
import { bech32ToHex } from "@/SnortUtils";
import { useEventFeed } from "@snort/system-react";
import { FormattedMessage } from "react-intl";
import DisplayName from "@/Element/User/DisplayName";
import useLogin from "@/Hooks/useLogin";

export function Header() {
  const location = useLocation();
  const pageName = location.pathname.split("/")[1];
  const [nostrLink, setNostrLink] = useState<NostrLink | undefined>();
  const { publicKey, tags } = useLogin();

  const isRootTab = useMemo(() => {
    return location.pathname === "/" || rootTabItems("", publicKey, tags).some(item => item.path === location.pathname);
  }, [location.pathname, publicKey, tags]);

  const scrollUp = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    try {
      setNostrLink(parseNostrLink(pageName));
    } catch (e) {
      setNostrLink(undefined);
    }
  }, [pageName]);

  let title: React.ReactNode = <span className="capitalize">{pageName}</span>;
  if (nostrLink) {
    if (nostrLink.type === NostrPrefix.Event || nostrLink.type === NostrPrefix.Note) {
      title = <NoteTitle link={nostrLink} />;
    } else if (nostrLink.type === NostrPrefix.PublicKey || nostrLink.type === NostrPrefix.Profile) {
      title = <DisplayName pubkey={bech32ToHex(pageName)} />;
    }
  } else if (location.pathname.startsWith("/t/")) {
    title = <span>#{location.pathname.split("/").slice(-1)}</span>;
  }

  return (
    <header
      className={classNames(
        { "md:hidden": pageName === "messages" },
        "flex justify-between items-center self-stretch px-4 gap-6 sticky top-0 z-10 bg-bg-color py-1 md:bg-header md:bg-opacity-50 md:shadow-lg md:backdrop-blur-lg",
      )}>
      <div className="md:hidden">
        <LogoHeader showText={false} />
      </div>
      {isRootTab && <RootTabs base="" />}
      {!isRootTab && (
        <div
          onClick={scrollUp}
          className="cursor-pointer flex-1 text-center p-2 overflow-hidden whitespace-nowrap truncate">
          {title}
        </div>
      )}
      <div className="md:hidden">
        <NotificationsHeader />
      </div>
    </header>
  );
}

function NoteTitle({ link }: { link: NostrLink }) {
  const ev = useEventFeed(link);

  if (!ev.data?.pubkey) {
    return <FormattedMessage defaultMessage="Note" id="qMePPG" />;
  }

  return (
    <>
      <FormattedMessage
        defaultMessage="Note by {name}"
        id="ALdW69"
        values={{ name: <DisplayName pubkey={ev.data.pubkey} /> }}
      />
    </>
  );
}
