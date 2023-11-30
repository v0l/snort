import React from "react";
import { NavLink } from "react-router-dom";
import useLogin from "@/Hooks/useLogin";
import Icon from "@/Icons/Icon";
import { ProfileLink } from "@/Element/User/ProfileLink";
import { NoteCreatorButton } from "@/Element/Event/Create/NoteCreatorButton";
import classNames from "classnames";
import { useUserProfile } from "@snort/system-react";
import Avatar from "@/Element/User/Avatar";
import { useIntl } from "react-intl";

const MENU_ITEMS = [
  { url: "/", icon: "home" },
  { url: "/messages", icon: "mail" },
  {
    el: (
      <div className="flex flex-grow items-center justify-center">
        <NoteCreatorButton alwaysShow={true} />
      </div>
    ),
  },
  { url: "/search", icon: "search" },
];

const Footer = () => {
  const { publicKey, readonly } = useLogin(s => ({
    publicKey: s.publicKey,
    readonly: s.readonly,
  }));
  const profile = useUserProfile(publicKey);
  const { formatMessage } = useIntl();

  const renderButton = item => {
    if (item.el) {
      return item.el;
    }
    return (
      <NavLink
        to={item.url}
        className={({ isActive }) =>
          classNames(
            { "text-nostr-purple": isActive, "hover:text-nostr-purple": !isActive },
            "flex flex-grow p-2 justify-center items-center cursor-pointer",
          )
        }>
        <Icon name={item.icon} width={24} />
      </NavLink>
    );
  };

  const readOnlyIcon = readonly && (
    <span style={{ transform: "rotate(135deg)" }} title={formatMessage({ defaultMessage: "Read-only", id: "djNL6D" })}>
      <Icon name="openeye" className="text-nostr-red" size={20} />
    </span>
  );

  return (
    <footer className="md:hidden fixed bottom-0 z-10 w-full bg-base-200 pb-safe-area bg-bg-color">
      <div className="flex">
        {MENU_ITEMS.map(item => renderButton(item))}
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

export default Footer;
