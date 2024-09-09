import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";
import React, { useState } from "react";
import { useIntl } from "react-intl";

import NavLink from "@/Components/Button/NavLink";
import { NoteCreatorButton } from "@/Components/Event/Create/NoteCreatorButton";
import Icon from "@/Components/Icons/Icon";
import Avatar from "@/Components/User/Avatar";
import { ProfileLink } from "@/Components/User/ProfileLink";
import useLogin from "@/Hooks/useLogin";

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
        <NoteCreatorButton alwaysShow={true} />
      </div>
    ),
    hideReadOnly: true,
  },
  { link: "/search", icon: "search" },
];

const Footer = () => {
  const { publicKey, readonly } = useLogin(s => ({
    publicKey: s.publicKey,
    readonly: s.readonly,
  }));
  const profile = useUserProfile(publicKey);
  const { formatMessage } = useIntl();

  const readOnlyIcon = readonly && (
    <span style={{ transform: "rotate(135deg)" }} title={formatMessage({ defaultMessage: "Read-only", id: "djNL6D" })}>
      <Icon name="openeye" className="text-nostr-red" size={20} />
    </span>
  );

  return (
    <footer className="md:hidden fixed bottom-0 z-10 w-full bg-base-200 pb-safe-area bg-background">
      <div className="flex">
        {MENU_ITEMS.map((item, index) => (
          <FooterNavItem key={index} item={item} readonly={readonly} />
        ))}
        {publicKey && (
          <ProfileLink
            className="flex flex-grow p-2 justify-center items-center cursor-pointer"
            pubkey={publicKey}
            user={profile}>
            <Avatar pubkey={publicKey} user={profile} icons={readOnlyIcon} size={40} />
          </ProfileLink>
        )}
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
        classNames({ active: isActive || isHovered }, "flex flex-grow p-4 justify-center items-center cursor-pointer")
      }>
      <Icon name={`${item.icon}-solid`} className="icon-solid" size={24} />
      <Icon name={`${item.icon}-outline`} className="icon-outline" size={24} />
    </NavLink>
  );
};

export default Footer;
