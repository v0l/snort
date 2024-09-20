import classNames from "classnames";
import React, { useState } from "react";

import NavLink from "@/Components/Button/NavLink";
import { NoteCreatorButton } from "@/Components/Event/Create/NoteCreatorButton";
import Icon from "@/Components/Icons/Icon";
import useLogin from "@/Hooks/useLogin";
import useWindowSize from "@/Hooks/useWindowSize";

import ProfileMenu from "./ProfileMenu";

type MenuItem = {
  label?: string;
  icon?: string;
  link?: string;
  nonLoggedIn?: boolean;
  el?: React.ReactNode;
  hideReadOnly?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { link: "/", icon: "home" },
  { link: "/messages", icon: "mail", hideReadOnly: true },
  {
    el: (
      <div className="flex flex-grow items-center justify-center">
        <NoteCreatorButton alwaysShow={true} withModal={true} />
      </div>
    ),
    hideReadOnly: true,
  },
  { link: "/search", icon: "search" },
];

const Footer = () => {
  const { readonly } = useLogin(s => ({
    readonly: s.readonly,
  }));
  const pageSize = useWindowSize();
  const isMobile = pageSize.width <= 768; //max-md
  if (!isMobile) return;

  return (
    <footer className="md:hidden fixed bottom-0 z-10 w-full bg-base-200 pb-safe-area bg-background">
      <div className="grid grid-flow-col">
        {MENU_ITEMS.map((item, index) => (
          <FooterNavItem key={index} item={item} readonly={readonly} />
        ))}

        <ProfileMenu className="flex justify-center items-center" />
      </div>
    </footer>
  );
};

const FooterNavItem = ({ item, readonly }: { item: MenuItem; readonly: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (readonly && item.hideReadOnly) {
    return null;
  }

  if (item.el) {
    return item.el;
  }

  return (
    <NavLink
      to={item.link ?? "/"}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={({ isActive }) =>
        classNames({ active: isActive || isHovered }, "flex flex-1 p-4 justify-center items-center cursor-pointer")
      }>
      <Icon name={`${item.icon}-solid`} className="icon-solid" size={24} />
      <Icon name={`${item.icon}-outline`} className="icon-outline" size={24} />
    </NavLink>
  );
};

export default Footer;
