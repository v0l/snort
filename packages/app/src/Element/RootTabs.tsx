import "./RootTabs.css";
import { useState, ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { FormattedMessage } from "react-intl";

import useLogin from "Hooks/useLogin";
import Icon from "Icons/Icon";

export type RootTab =
  | "following"
  | "conversations"
  | "trending-notes"
  | "trending-people"
  | "suggested"
  | "tags"
  | "global";

export function RootTabs({ base }: { base?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey: pubKey, tags } = useLogin();
  const [rootType, setRootType] = useState<RootTab>("following");

  const menuItems = [
    {
      tab: "following",
      path: `${base}/notes`,
      show: Boolean(pubKey),
      element: (
        <>
          <Icon name="user-v2" />
          <FormattedMessage defaultMessage="Following" />
        </>
      ),
    },
    {
      tab: "trending-notes",
      path: `${base}/trending/notes`,
      show: true,
      element: (
        <>
          <Icon name="fire" />
          <FormattedMessage defaultMessage="Trending Notes" />
        </>
      ),
    },
    {
      tab: "conversations",
      path: `${base}/conversations`,
      show: Boolean(pubKey),
      element: (
        <>
          <Icon name="message-chat-circle" />
          <FormattedMessage defaultMessage="Conversations" />
        </>
      ),
    },
    {
      tab: "trending-people",
      path: `${base}/trending/people`,
      show: true,
      element: (
        <>
          <Icon name="user-up" />
          <FormattedMessage defaultMessage="Trending People" />
        </>
      ),
    },
    {
      tab: "suggested",
      path: `${base}/suggested`,
      show: Boolean(pubKey),
      element: (
        <>
          <Icon name="thumbs-up" />
          <FormattedMessage defaultMessage="Suggested Follows" />
        </>
      ),
    },
    {
      tab: "global",
      path: `${base}/global`,
      show: true,
      element: (
        <>
          <Icon name="globe" />
          <FormattedMessage defaultMessage="Global" />
        </>
      ),
    },
  ] as Array<{
    tab: RootTab;
    path: string;
    show: boolean;
    element: ReactNode;
  }>;

  useEffect(() => {
    const currentTab = menuItems.find(a => a.path === location.pathname)?.tab;
    if (currentTab) {
      setRootType(currentTab);
    }
  }, [location]);

  function currentMenuItem() {
    if (location.pathname.startsWith(`${base}/t/`)) {
      return (
        <>
          <Icon name="hash" />
          {location.pathname.split("/").slice(-1)}
        </>
      );
    }
    return menuItems.find(a => a.tab === rootType)?.element;
  }

  return (
    <div className="root-type">
      <Menu
        menuButton={
          <button type="button">
            {currentMenuItem()}
            <Icon name="chevronDown" />
          </button>
        }
        align="center"
        menuClassName={() => "ctx-menu"}>
        <div className="close-menu-container">
          <MenuItem>
            <div className="close-menu" />
          </MenuItem>
        </div>
        {menuItems
          .filter(a => a.show)
          .map(a => (
            <MenuItem
              onClick={() => {
                navigate(a.path);
              }}>
              {a.element}
            </MenuItem>
          ))}
        {tags.item.map(v => (
          <MenuItem
            onClick={() => {
              navigate(`${base}/t/${v}`);
            }}>
            <Icon name="hash" />
            {v}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
