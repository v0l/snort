import { LogoHeader } from "./LogoHeader";
import { Link } from "react-router-dom";
import Icon from "@/Icons/Icon";
import {ProfileLink} from "../../Element/User/ProfileLink";
import Avatar from "../../Element/User/Avatar";
import useLogin from "../../Hooks/useLogin";
import {useUserProfile} from "@snort/system-react";
import {NoteCreatorButton} from "../../Element/Event/NoteCreatorButton";

const MENU_ITEMS = [
  {
    label: "Home",
    icon: "home",
    link: "/",
  },
  {
    label: "Messages",
    icon: "mail",
    link: "/messages",
  },
  {
    label: "Notifications",
    icon: "bell-02",
    link: "/notifications",
  },
  {
    label: "Settings",
    icon: "settings",
    link: "/settings",
  },
];

export default function NavSidebar() {
  const { publicKey } = useLogin(s => ({
    publicKey: s.publicKey,
    latestNotification: s.latestNotification,
    readNotifications: s.readNotifications,
    readonly: s.readonly,
  }));
  const profile = useUserProfile(publicKey);

  return (
    <div className="sticky items-center xl:items-start border-r border-neutral-900 top-0 z-20 h-screen max-h-screen hidden md:flex xl:w-56 flex-col px-2 py-4 flex-shrink-0 gap-4">
      <LogoHeader />
      <div className="flex-grow flex flex-col justify-between">
        <div className="flex flex-col items-center xl:items-start font-bold text-lg">
          {MENU_ITEMS.map(item => (
            <NavLink
              key={item.link}
              to={item.link}
              className="py-4 hover:no-underline hover:text-nostr-purple flex flex-row items-center"
              activeClassName="bg-neutral-800 text-neutral-200">
              <Icon name={item.icon} size={24} />
              <span className="hidden xl:inline ml-2">{item.label}</span>
            </NavLink>
          ))}
          <div className="mt-2">
            <NoteCreatorButton alwaysShow={true} />
          </div>
        </div>
      </div>
      {publicKey ? (
        <>
          <ProfileLink pubkey={publicKey} user={profile}>
            <div className="flex flex-row items-center font-bold text-md">
              <Avatar pubkey={publicKey} user={profile} size={40} />
              <span className="hidden xl:inline ml-2">{profile?.name}</span>
            </div>
          </ProfileLink>
        </>
      ) : ''}
    </div>
  );
}

function NavLink({ children, ...props }) {
  return (
    <Link to={""} {...props}>
      {children}
    </Link>
  );
}
