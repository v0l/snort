import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";
import { Link, useNavigate } from "react-router-dom";

import NavLink from "@/Components/Button/NavLink";
import { NoteCreatorButton } from "@/Components/Event/Create/NoteCreatorButton";
import Icon from "@/Components/Icons/Icon";
import Avatar from "@/Components/User/Avatar";
import { ProfileLink } from "@/Components/User/ProfileLink";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { useRates } from "@/Hooks/useRates";
import { HasNotificationsMarker } from "@/Pages/Layout/HasNotificationsMarker";
import { subscribeToNotifications } from "@/Utils/Notifications";
import { getCurrentSubscription } from "@/Utils/Subscription";
import { Sats, useWallet } from "@/Wallet";

import useLogin from "../../Hooks/useLogin";
import { LogoHeader } from "./LogoHeader";

const MENU_ITEMS = [
  {
    label: "Home",
    icon: "home",
    link: "/",
    nonLoggedIn: true,
  },
  {
    label: "Search",
    icon: "search",
    link: "/search",
    nonLoggedIn: true,
  },
  {
    label: "Notifications",
    icon: "bell",
    link: "/notifications",
  },
  {
    label: "Messages",
    icon: "mail",
    link: "/messages",
    hideReadOnly: true,
  },
  {
    label: "Deck",
    icon: "deck",
    link: "/deck",
  },
  {
    label: "Social Graph",
    icon: "graph",
    link: "/graph",
  },
  {
    label: "About",
    icon: "info",
    link: "/donate",
    nonLoggedIn: true,
  },
  {
    label: "Settings",
    icon: "settings",
    link: "/settings",
  },
];

const getNavLinkClass = (isActive: boolean, narrow: boolean) => {
  const baseClasses =
    "rounded-full p-3 flex flex-row items-center transition-colors duration-200 hover:bg-bg-secondary hover:no-underline";
  const activeClasses = "active font-bold";

  return classNames(baseClasses, {
    [activeClasses]: isActive,
    "xl:px-4": !narrow,
  });
};

const WalletBalance = () => {
  const [balance, setBalance] = useState<Sats>();
  const wallet = useWallet();
  const rates = useRates("BTCUSD");

  useEffect(() => {
    setBalance(undefined);
    if (wallet.wallet && wallet.wallet.canGetBalance()) {
      wallet.wallet.getBalance().then(setBalance);
    }
  }, [wallet]);

  const msgValues = useMemo(() => {
    return {
      amount: <FormattedNumber style="currency" currency="USD" value={(rates?.ask ?? 0) * (balance ?? 0) * 1e-8} />,
    };
  }, [balance, rates]);

  return (
    <div className="w-max flex flex-col max-xl:hidden">
      <div className="grow flex items-center justify-between">
        <div className="flex gap-1 items-center">
          <Icon name="sats" size={24} />
          <FormattedNumber value={balance ?? 0} />
        </div>
        <Link to="/wallet">
          <Icon name="dots" className="text-secondary" />
        </Link>
      </div>
      <div className="text-secondary text-sm">
        <FormattedMessage defaultMessage="~{amount}" id="3QwfJR" values={msgValues} />
      </div>
    </div>
  );
};

export default function NavSidebar({ narrow = false }: { narrow: boolean }) {
  const { publicKey, subscriptions, readonly } = useLogin(s => ({
    publicKey: s.publicKey,
    subscriptions: s.subscriptions,
    readonly: s.readonly,
  }));
  const profile = useUserProfile(publicKey);
  const navigate = useNavigate();
  const { publisher } = useEventPublisher();
  const sub = getCurrentSubscription(subscriptions);
  const { formatMessage } = useIntl();

  const className = classNames(
    { "xl:w-56 xl:gap-2 xl:items-start": !narrow },
    "overflow-y-auto hide-scrollbar sticky items-center border-r border-border-color top-0 z-20 h-screen max-h-screen hidden md:flex flex-col px-2 py-4 flex-shrink-0 gap-1",
  );

  const readOnlyIcon = readonly && (
    <span style={{ transform: "rotate(135deg)" }} title={formatMessage({ defaultMessage: "Read-only", id: "djNL6D" })}>
      <Icon name="openeye" className="text-nostr-red" size={20} />
    </span>
  );

  const showDeck = CONFIG.showDeck || !(CONFIG.deckSubKind !== undefined && (sub?.type ?? -1) < CONFIG.deckSubKind);

  return (
    <div className={className}>
      <LogoHeader showText={!narrow} />
      <div className="mt-1 flex-grow flex flex-col justify-between">
        <div
          className={classNames(
            { "xl:items-start": !narrow, "xl:gap-2": !narrow },
            "gap-1 flex flex-col items-center text-lg font-bold",
          )}>
          <WalletBalance />
          {MENU_ITEMS.filter(a => {
            if ((CONFIG.hideFromNavbar ?? []).includes(a.link)) {
              return false;
            }
            if (a.link == "/deck" && !showDeck) {
              return false;
            }
            if (readonly && a.hideReadOnly) {
              return false;
            }
            return true;
          }).map(item => {
            if (!item.nonLoggedIn && !publicKey) {
              return "";
            }
            const onClick = () => {
              if (item.label === "Notifications" && publisher) {
                subscribeToNotifications(publisher);
              }
            };
            return (
              <NavLink
                onClick={onClick}
                key={item.link}
                to={item.link}
                className={({ isActive }) => getNavLinkClass(isActive, narrow)}>
                <Icon name={`${item.icon}-outline`} className="icon-outline" size={24} />
                <Icon name={`${item.icon}-solid`} className="icon-solid" size={24} />
                {item.label === "Notifications" && <HasNotificationsMarker />}
                {!narrow && <span className="hidden xl:inline ml-3">{item.label}</span>}
              </NavLink>
            );
          })}
          {publicKey ? (
            <div className="mt-2">
              <NoteCreatorButton alwaysShow={true} showText={!narrow} />
            </div>
          ) : (
            <div className="mt-2">
              <button onClick={() => navigate("/login/sign-up")} className="flex flex-row items-center primary">
                <Icon name="sign-in" size={24} />
                {!narrow && (
                  <span className="hidden xl:inline ml-3">
                    <FormattedMessage defaultMessage="Sign up" id="8HJxXG" />
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      {publicKey && (
        <>
          <ProfileLink pubkey={publicKey} user={profile} className="hover:no-underline">
            <div className="mt-2 flex flex-row items-center justify-center font-bold text-md p-1 xl:px-4 xl:py-3 hover:bg-bg-secondary rounded-full cursor-pointer">
              <Avatar pubkey={publicKey} user={profile} size={40} icons={readOnlyIcon} />
              {!narrow && <span className="hidden xl:inline ml-3">{profile?.name}</span>}
            </div>
          </ProfileLink>
          {readonly && (
            <div className="hidden xl:block text-nostr-red text-sm m-3">
              <FormattedMessage defaultMessage="Read-only" id="djNL6D" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
