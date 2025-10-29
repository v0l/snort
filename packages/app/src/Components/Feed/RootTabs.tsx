import { unwrap } from "@snort/shared";
import { EventKind } from "@snort/system";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { rootTabItems } from "@/Components/Feed/RootTabItems";
import Icon from "@/Components/Icons/Icon";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import { RootTabRoutePath } from "@/Pages/Root/RootTabRoutes";

export function RootTabs({ base = "/" }: { base: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey: pubKey, tags } = useLogin(s => ({
    publicKey: s.publicKey,
    tags: s.state.getList(EventKind.InterestSet),
  }));
  const defaultRootTab = usePreferences(s => s.defaultRootTab);

  const hashTags = tags.filter(a => a.toEventTag()?.[0] === "t").map(a => unwrap(a.toEventTag())[1]);
  const menuItems = useMemo(() => rootTabItems(base, pubKey, hashTags), [base, pubKey, tags]);

  let defaultTab: RootTabRoutePath;
  if (pubKey) {
    defaultTab = defaultRootTab;
  } else {
    defaultTab = `trending/notes`;
  }
  const initialPathname = location.pathname === "/" ? defaultTab : location.pathname;
  const initialRootType = menuItems.find(a => a.path === initialPathname)?.tab || defaultTab;

  const [rootType, setRootType] = useState<RootTabRoutePath>(initialRootType);

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
    return menuItems.find(a => a.tab === rootType)?.element ?? menuItems[0].element;
  }

  const itemClassName =
    "px-6 py-2 text-base font-semibold bg-layer-2 light:bg-white hover:bg-layer-3 light:hover:bg-neutral-200 cursor-pointer outline-none flex gap-3 items-center";

  return (
    <div className="root-type flex items-center justify-center flex-grow">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="bg-transparent text-font-color text-base px-4 py-2.5 flex items-center justify-center gap-3 border-none shadow-none hover:!shadow-none">
            {currentMenuItem()}
            <Icon name="chevronDown" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="bg-layer-2 rounded-2xl overflow-hidden z-[9999] min-w-48"
            sideOffset={5}
            align="center">
            {menuItems
              .filter(a => a.show)
              .map(a => (
                <DropdownMenu.Item
                  key={a.tab}
                  className={itemClassName}
                  onClick={e => {
                    e.stopPropagation();
                    navigate(a.path);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}>
                  {a.element}
                </DropdownMenu.Item>
              ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
