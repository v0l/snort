import { LogoHeader } from "./LogoHeader";
import { Link } from "react-router-dom";
import Icon from "@/Icons/Icon";

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
    icon: "cog",
    link: "/settings",
  },
];

export default function NavSidebar() {
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
