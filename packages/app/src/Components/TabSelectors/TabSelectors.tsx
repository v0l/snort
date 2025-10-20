import classNames from "classnames";
import { ReactNode } from "react";

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
        "flex gap-2 items-center px-4 py-2 my-1 border rounded-full cursor-pointer font-semibold bg-neutral-800 light:bg-neutral-200",
        "hover:drop-shadow-sm hover:bg-neutral-600 light:hover:bg-neutral-300",
        {
          "": tab.value === t.value,
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
    <div className={classNames(className, "flex gap-2 overflow-y-auto hide-scrollbar")} ref={horizontalScroll}>
      {tabs.map((t, index) => (
        <TabSelector key={index} tab={tab} setTab={setTab} t={t} />
      ))}
    </div>
  );
};

export default TabSelectors;
