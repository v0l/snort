import "./Tabs.css";
import { ReactElement } from "react";

export interface Tab {
  text: ReactElement | string;
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
      className={`tab ${tab.value === t.value ? "active" : ""} ${
        t.disabled ? "disabled" : ""
      }`}
      onClick={() => !t.disabled && setTab(t)}
    >
      {t.text}
    </div>
  );
};

const Tabs = ({ tabs, tab, setTab }: TabsProps) => {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <TabElement tab={tab} setTab={setTab} t={t} />
      ))}
    </div>
  );
};

export default Tabs;
