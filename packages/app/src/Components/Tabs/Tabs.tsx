import "./Tabs.css";

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
  setTab: (t: Tab) => void;
}

interface TabElementProps extends Omit<TabsProps, "tabs"> {
  t: Tab;
}

export const TabElement = ({ t, tab, setTab }: TabElementProps) => {
  return (
    <div
      className={`tab${tab.value === t.value ? " active" : ""}${t.disabled ? " disabled" : ""}`}
      onClick={() => !t.disabled && setTab(t)}>
      {t.text}
    </div>
  );
};

const Tabs = ({ tabs, tab, setTab }: TabsProps) => {
  const horizontalScroll = useHorizontalScroll();
  return (
    <div className="tabs" ref={horizontalScroll}>
      {tabs.map((t, index) => (
        <TabElement key={index} tab={tab} setTab={setTab} t={t} />
      ))}
    </div>
  );
};

export default Tabs;
