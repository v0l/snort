import { LogoHeader } from "./LogoHeader";
import { Link } from "react-router-dom";
import Icon from "@/Icons/Icon";
import {ProfileLink} from "../../Element/User/ProfileLink";
import Avatar from "../../Element/User/Avatar";
import useLogin from "../../Hooks/useLogin";
import {useUserProfile} from "@snort/system-react";

const MENU_ITEMS = [
  {
    label: "Notes",
    icon: "notes",
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
    <div className="sticky border-r border-neutral-900 top-0 z-20 h-screen max-h-screen hidden md:flex xl:w-56 flex-col px-2 py-4 flex-shrink-0 gap-2">
      <LogoHeader />
      <div className="flex-grow flex flex-col justify-between">
        <div className="flex flex-col">
          {MENU_ITEMS.map(item => (
            <NavLink
              key={item.link}
              to={item.link}
              className="settings-row hover:no-underline"
              activeClassName="bg-neutral-800 text-neutral-200">
              <Icon name={item.icon} size={24} />
              <span className="hidden xl:inline ml-2">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
      {publicKey ? (
        <ProfileLink pubkey={publicKey} user={profile}>
          <div className="flex flex-row items-center">
            <Avatar pubkey={publicKey} user={profile} size={40} />
            <span className="hidden xl:inline ml-2">{profile?.name}</span>
          </div>
        </ProfileLink>
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
