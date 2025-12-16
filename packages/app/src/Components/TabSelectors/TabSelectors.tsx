import classNames from "classnames";
import type { ReactNode } from "react";

import useHorizontalScroll from "@/Hooks/useHorizontalScroll";

export interface Tab {
  text: ReactNode;
  value: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  tab: Tab;
  className?: string;
  setTab: (t: Tab) => void;
}

interface TabElementProps extends Omit<TabsProps, "tabs"> {
  t: Tab;
}

export const TabSelector = ({ t, tab, setTab }: TabElementProps) => {
  return (
    <div
      className={classNames(
        "flex gap-2 items-center px-4 py-2 my-1 layer-1-hover rounded-full cursor-pointer font-semibold whitespace-pre",
        "hover:drop-shadow-sm",
        {
          "bg-layer-3": tab.value === t.value,
          disabled: t.disabled,
        },
      )}
      onClick={() => !t.disabled && setTab(t)}>
      {t.text}
    </div>
  );
};

const TabSelectors = ({ tabs, tab, className, setTab }: TabsProps) => {
  const horizontalScroll = useHorizontalScroll();
  return (
    <div className={classNames(className, "flex gap-2 overflow-hidden hide-scrollbar w-full")} ref={horizontalScroll}>
      {tabs.map((t, index) => (
        <TabSelector key={index} tab={tab} setTab={setTab} t={t} />
      ))}
    </div>
  );
};

export default TabSelectors;
