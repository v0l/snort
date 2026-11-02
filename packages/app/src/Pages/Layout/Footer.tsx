import classNames from "classnames"
import type React from "react"

import NavLink from "@/Components/Button/NavLink"
import { NoteCreatorButton } from "@/Components/Event/Create/NoteCreatorButton"
import Icon from "@/Components/Icons/Icon"
import useLogin from "@/Hooks/useLogin"
import useWindowSize from "@/Hooks/useWindowSize"

import { HasNotificationsMarker, UnreadMessages } from "./HasNotificationsMarker"

type MenuItem = {
  label: string
  icon?: string
  solid?: boolean
  link?: string
  el?: React.ReactNode
  badge?: React.ReactNode
  loggedIn?: boolean
  hideReadOnly?: boolean
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Home", link: "/", icon: "home", solid: true },
  { label: "Worth a look", link: "/worth-a-look", icon: "stars" },
  {
    label: "New note",
    el: (
      <div className="flex flex-grow items-center justify-center">
        <NoteCreatorButton alwaysShow={true} withModal={true} />
      </div>
    ),
    loggedIn: true,
    hideReadOnly: true,
  },
  {
    label: "Notifications",
    link: "/notifications",
    icon: "bell",
    solid: true,
    badge: <HasNotificationsMarker />,
    loggedIn: true,
  },
  { label: "Messages", link: "/messages", icon: "mail", solid: true, badge: <UnreadMessages />, hideReadOnly: true },
]

const Footer = () => {
  const { readonly, publicKey } = useLogin(s => ({
    readonly: s.readonly,
    publicKey: s.publicKey,
  }))
  const pageSize = useWindowSize()
  const isMobile = pageSize.width <= 768 //max-md
  if (!isMobile) return

  const items = MENU_ITEMS.filter(a => !(readonly && a.hideReadOnly) && !((a.loggedIn || a.hideReadOnly) && !publicKey))

  return (
    <nav className="md:hidden fixed bottom-0 z-10 w-full pb-safe-area bg-layer-1 border-t" aria-label="Main">
      <div className="grid grid-flow-col">
        {items.map(item => (
          <FooterNavItem key={item.label} item={item} />
        ))}
      </div>
    </nav>
  )
}

const FooterNavItem = ({ item }: { item: MenuItem }) => {
  if (item.el) {
    return item.el
  }

  return (
    <NavLink
      to={item.link ?? "/"}
      aria-label={item.label}
      className={({ isActive }) =>
        classNames({ active: isActive }, "flex flex-1 p-4 justify-center items-center cursor-pointer")
      }
    >
      <span className="relative inline-flex">
        {item.solid ? (
          <>
            <Icon name={`${item.icon}-solid`} className="icon-solid" size={24} />
            <Icon name={`${item.icon}-outline`} className="icon-outline" size={24} />
          </>
        ) : (
          <Icon name={item.icon ?? ""} size={24} />
        )}
        {item.badge}
      </span>
    </NavLink>
  )
}

export default Footer
