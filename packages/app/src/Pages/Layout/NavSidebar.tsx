import { LogoHeader } from "./LogoHeader";
import { useNavigate } from "react-router-dom";
import Icon from "@/Icons/Icon";
import { ProfileLink } from "../../Element/User/ProfileLink";
import Avatar from "../../Element/User/Avatar";
import useLogin from "../../Hooks/useLogin";
import { useUserProfile } from "@snort/system-react";
import { NoteCreatorButton } from "../../Element/Event/Create/NoteCreatorButton";
import { FormattedMessage, useIntl } from "react-intl";
import classNames from "classnames";
import { getCurrentSubscription } from "@/Subscription";
import { HasNotificationsMarker } from "@/Pages/Layout/HasNotificationsMarker";
import NavLink from "@/Element/Button/NavLink";

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
  const c = isActive
    ? "rounded-full p-3 active font-bold hover:bg-bg-secondary hover:no-underline flex flex-1 flex-row items-center"
    : "rounded-full p-3 hover:no-underline hover:bg-bg-secondary flex flex-row items-center";
  return classNames(c, { "xl:px-4": !narrow });
};

export default function NavSidebar({ narrow = false }) {
  const { publicKey, subscriptions, readonly } = useLogin(s => ({
    publicKey: s.publicKey,
    subscriptions: s.subscriptions,
    readonly: s.readonly,
  }));
  const profile = useUserProfile(publicKey);
  const navigate = useNavigate();
  const sub = getCurrentSubscription(subscriptions);
  const { formatMessage } = useIntl();

  const className = classNames(
    { "xl:w-56 xl:gap-3 xl:items-start": !narrow },
    "overflow-y-auto hide-scrollbar sticky items-center border-r border-border-color top-0 z-20 h-screen max-h-screen hidden md:flex flex-col px-2 py-4 flex-shrink-0 gap-2",
  );

  const readOnlyIcon = readonly && (
    <span style={{ transform: "rotate(135deg)" }} title={formatMessage({ defaultMessage: "Read-only", id: "djNL6D" })}>
      <Icon name="openeye" className="text-nostr-red" size={20} />
    </span>
  );

  return (
    <div className={className}>
      <LogoHeader showText={!narrow} />
      <div className="mt-1 flex-grow flex flex-col justify-between">
        <div className={classNames({ "xl:items-start": !narrow, "xl:gap-3": !narrow }, "gap-2 flex flex-col items-center text-lg")}>
          {MENU_ITEMS.filter(a => {
            if ((CONFIG.hideFromNavbar ?? []).includes(a.link)) {
              return false;
            }
            if (a.link == "/deck" && CONFIG.deckSubKind !== undefined && (sub?.type ?? -1) < CONFIG.deckSubKind) {
              return false;
            }
            return true;
          }).map(item => {
            if (!item.nonLoggedIn && !publicKey) {
              return "";
            }
            return (
              <NavLink key={item.link} to={item.link} className={({ isActive }) => getNavLinkClass(isActive, narrow)}>
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
          <ProfileLink pubkey={publicKey} user={profile}>
            <div className="mt-2 flex flex-row items-center font-bold text-md p-1 xl:px-4 xl:py-3 hover:bg-bg-secondary rounded-full cursor-pointer hover:no-underline">
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
