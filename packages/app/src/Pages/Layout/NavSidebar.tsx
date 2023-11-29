import { LogoHeader } from "./LogoHeader";
import { NavLink, useNavigate } from "react-router-dom";
import Icon from "@/Icons/Icon";
import { ProfileLink } from "../../Element/User/ProfileLink";
import Avatar from "../../Element/User/Avatar";
import useLogin from "../../Hooks/useLogin";
import { useUserProfile } from "@snort/system-react";
import { NoteCreatorButton } from "../../Element/Event/Create/NoteCreatorButton";
import { FormattedMessage } from "react-intl";
import classNames from "classnames";
import { HasNotificationsMarker } from "@/Pages/Layout/AccountHeader";

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
    icon: "bell-02",
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
    ? "py-4 hover:no-underline flex flex-row items-center text-nostr-purple"
    : "py-4 hover:no-underline hover:text-nostr-purple flex flex-row items-center";
  return classNames(c, { "xl:ml-1": !narrow });
};

export default function NavSidebar({ narrow = false }) {
  const { publicKey } = useLogin(s => ({
    publicKey: s.publicKey,
  }));
  const profile = useUserProfile(publicKey);
  const navigate = useNavigate();

  const className = classNames(
    { "xl:w-56 xl:gap-3 xl:items-start": !narrow },
    "overflow-y-auto hide-scrollbar sticky items-center border-r border-neutral-900 top-0 z-20 h-screen max-h-screen hidden md:flex flex-col px-2 py-4 flex-shrink-0 gap-2",
  );

  return (
    <div className={className}>
      <LogoHeader showText={!narrow} />
      <div className="flex-grow flex flex-col justify-between">
        <div className={classNames({ "xl:items-start": !narrow }, "flex flex-col items-center font-bold text-lg")}>
          {MENU_ITEMS.map(item => {
            if (!item.nonLoggedIn && !publicKey) {
              return "";
            }
            return (
              <NavLink key={item.link} to={item.link} className={({ isActive }) => getNavLinkClass(isActive, narrow)}>
                <Icon name={item.icon} size={24} />
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
      {publicKey ? (
        <>
          <ProfileLink pubkey={publicKey} user={profile}>
            <div className="flex flex-row items-center font-bold text-md">
              <Avatar pubkey={publicKey} user={profile} size={40} />
              {!narrow && <span className="hidden xl:inline ml-3">{profile?.name}</span>}
            </div>
          </ProfileLink>
        </>
      ) : (
        ""
      )}
    </div>
  );
}
