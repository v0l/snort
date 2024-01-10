import "./RootTabs.css";

import {Menu, MenuItem} from "@szhsin/react-menu";
import {useEffect, useMemo, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";

import {RootTab, rootTabItems} from "@/Components/Feed/RootTabItems";
import Icon from "@/Components/Icons/Icon";
import useLogin from "@/Hooks/useLogin";

export function RootTabs({ base = "/" }: { base: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    publicKey: pubKey,
    tags,
    preferences,
  } = useLogin(s => ({
    publicKey: s.publicKey,
    tags: s.tags,
    preferences: s.appData.item.preferences,
  }));

  const menuItems = useMemo(() => rootTabItems(base, pubKey, tags), [base, pubKey, tags]);

  const defaultTab = pubKey ? preferences.defaultRootTab ?? `${base}/notes` : `${base}/trending/notes`;
  const initialPathname = location.pathname === "/" ? defaultTab : location.pathname;
  const initialRootType = menuItems.find(a => a.path === initialPathname)?.tab || "following";

  const [rootType, setRootType] = useState<RootTab>(initialRootType);

  useEffect(() => {
    const currentTab = menuItems.find(a => a.path === location.pathname)?.tab;
    if (currentTab && currentTab !== rootType) {
      setRootType(currentTab);
    }
  }, [location.pathname, menuItems, rootType]);

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
