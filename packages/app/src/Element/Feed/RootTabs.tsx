import "./RootTabs.css";
import { useState, ReactNode, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { FormattedMessage } from "react-intl";

import useLogin from "@/Hooks/useLogin";
import Icon from "@/Icons/Icon";
import { Newest } from "@/Login";

export type RootTab =
  | "following"
  | "conversations"
  | "trending-notes"
  | "trending-people"
  | "suggested"
  | "tags"
  | "global";

export function rootTabItems(base: string, pubKey: string | undefined, tags: Newest<Array<string>>) {
  const menuItems = [
    {
      tab: "following",
      path: `${base}/notes`,
      show: Boolean(pubKey),
      element: (
        <>
          <Icon name="user-v2" />
          <FormattedMessage defaultMessage="Following" id="cPIKU2" />
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
          <FormattedMessage defaultMessage="Trending Notes" id="Ix8l+B" />
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
          <FormattedMessage defaultMessage="Conversations" id="1udzha" />
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
          <FormattedMessage defaultMessage="Trending People" id="CVWeJ6" />
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
          <FormattedMessage defaultMessage="Suggested Follows" id="C8HhVE" />
        </>
      ),
    },
    {
      tab: "trending-hashtags",
      path: `${base}/trending/hashtags`,
      show: true,
      element: (
        <>
          <Icon name="hash" />
          <FormattedMessage defaultMessage="Trending Hashtags" id="XXm7jJ" />
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
          <FormattedMessage defaultMessage="Global" id="EWyQH5" />
        </>
      ),
    },
    {
      tab: "tags",
      path: `${base}/topics`,
      show: tags.item.length > 0,
      element: (
        <>
          <Icon name="hash" />
          <FormattedMessage defaultMessage="Topics" id="kc79d3" />
        </>
      ),
    },
  ] as Array<{
    tab: RootTab;
    path: string;
    show: boolean;
    element: ReactNode;
  }>;
  return menuItems;
}

export function RootTabs({ base }: { base?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey: pubKey, tags } = useLogin();
  const [rootType, setRootType] = useState<RootTab>("following");

  const menuItems = useMemo(() => rootTabItems(base, pubKey, tags), [base, pubKey, tags]);

  useEffect(() => {
    const pathname = location.pathname === "/" ? `${base}/notes` : location.pathname;
    const currentTab = menuItems.find(a => a.path === pathname)?.tab;
    if (currentTab) {
      setRootType(currentTab);
    }
  }, [location, menuItems]);

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
              key={a.tab}
              onClick={() => {
                navigate(a.path);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}>
              {a.element}
            </MenuItem>
          ))}
      </Menu>
    </div>
  );
}
