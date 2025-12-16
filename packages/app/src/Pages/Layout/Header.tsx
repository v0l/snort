import { Bech32Regex, bech32ToHex, NostrPrefix, unwrap } from "@snort/shared";
import { EventKind, type NostrLink, tryParseNostrLink } from "@snort/system";
import { useEventFeed } from "@snort/system-react";
import classNames from "classnames";
import type React from "react";
import { useCallback, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { useLocation, useNavigate } from "react-router-dom";

import { rootTabItems } from "@/Components/Feed/RootTabItems";
import { RootTabs } from "@/Components/Feed/RootTabs";
import Icon from "@/Components/Icons/Icon";
import KindName from "@/Components/kind-name";
import DisplayName from "@/Components/User/DisplayName";
import useLogin from "@/Hooks/useLogin";
import { LogoHeader } from "@/Pages/Layout/LogoHeader";
import NotificationsHeader from "@/Pages/Layout/NotificationsHeader";
import { findTag } from "@/Utils";
import { RelayName } from "@/Components/Relay/name";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathSplit = location.pathname.split("/");
  const pageName = decodeURIComponent(pathSplit[1]);

  const nostrLink = useMemo(() => {
    const nostrEntity = pathSplit.find(a => a.match(Bech32Regex));
    if (nostrEntity) {
      return tryParseNostrLink(nostrEntity);
    }
  }, [pathSplit]);

  const { publicKey, tags } = useLogin(s => ({
    publicKey: s.publicKey,
    tags: s.state.getList(EventKind.InterestsList),
  }));

  const isRootTab = useMemo(() => {
    // todo: clean this up, its also in other places
    const hashTags = tags.filter(a => a.toEventTag()?.[0] === "t").map(a => unwrap(a.toEventTag())[1]);
    return (
      location.pathname === "/" || rootTabItems("", publicKey, hashTags).some(item => item.path === location.pathname)
    );
  }, [location.pathname, publicKey, tags]);

  const scrollUp = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const handleBackButtonClick = () => {
    const idx = window.history.state?.idx;
    if (idx === undefined || idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };
  const showBackButton = location.pathname !== "/" && !isRootTab;

  let title: React.ReactNode = <span className="capitalize">{pageName}</span>;
  if (location.pathname.startsWith("/search/")) {
    const searchTerm = decodeURIComponent(location.pathname.split("/search/")[1]);
    title = (
      <>
        <FormattedMessage defaultMessage="Search" />: {searchTerm}
      </>
    );
  } else if (nostrLink) {
    if (
      nostrLink.type === NostrPrefix.Event ||
      nostrLink.type === NostrPrefix.Note ||
      nostrLink.type === NostrPrefix.Address
    ) {
      title = <NoteTitle link={nostrLink} />;
    } else if (nostrLink.type === NostrPrefix.PublicKey || nostrLink.type === NostrPrefix.Profile) {
      try {
        title = <DisplayName pubkey={bech32ToHex(pageName)} />;
      } catch (e) {
        console.error(e);
      }
    }
  } else if (location.pathname.startsWith("/t/")) {
    title = <span>#{location.pathname.split("/").slice(-1)}</span>;
  } else if (location.pathname.startsWith("/relay")) {
    title = <RelayName url={decodeURIComponent(location.pathname.split("/").pop()!)} />;
  }

  return (
    <header
      className={classNames(
        { "md:hidden": pageName === "messages" },
        "flex justify-between items-center self-stretch gap-6 sticky top-0 z-10 backdrop-blur-lg",
      )}>
      <div
        onClick={handleBackButtonClick}
        className={classNames({ hidden: !showBackButton }, "p-2 md:p-3 cursor-pointer")}>
        <Icon name="arrowBack" />
      </div>
      {!showBackButton && (
        <div className="p-2 md:p-0 md:invisible">
          <LogoHeader showText={false} />
        </div>
      )}
      {isRootTab && <RootTabs base="" />}
      {!isRootTab && (
        <div
          onClick={scrollUp}
          className="cursor-pointer flex-1 text-center p-2 overflow-hidden whitespace-nowrap truncate md:text-lg">
          {title}
        </div>
      )}
      <div className="md:invisible">
        <NotificationsHeader />
      </div>
    </header>
  );
}

function NoteTitle({ link }: { link: NostrLink }) {
  const ev = useEventFeed(link);

  if (!ev?.pubkey) {
    return <FormattedMessage defaultMessage="Note" />;
  }
  const title = findTag(ev, "title");
  return (
    <>
      <FormattedMessage
        defaultMessage="{note_type} by {name}{title}"
        values={{
          note_type: <KindName kind={ev.kind} />,
          name: <DisplayName pubkey={ev.pubkey} />,
          title: title ? ` - ${title}` : "",
        }}
      />
    </>
  );
}
