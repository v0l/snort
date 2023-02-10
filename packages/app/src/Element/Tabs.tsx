import "./Tabs.css";
import useHorizontalScroll from "Hooks/useHorizontalScroll";
import { CSSProperties } from "react";

export interface Tab {
  text: string;
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
  const style = { minWidth: `${t.text.length * 0.6}em` } as CSSProperties;
  return (
    <div
      className={`tab ${tab.value === t.value ? "active" : ""} ${t.disabled ? "disabled" : ""}`}
      style={style}
      onClick={() => !t.disabled && setTab(t)}>
      {t.text}
    </div>
  );
};

const Tabs = ({ tabs, tab, setTab }: TabsProps) => {
  const horizontalScroll = useHorizontalScroll();
  return (
    <div className="tabs" ref={horizontalScroll}>
      {tabs.map(t => (
        <TabElement tab={tab} setTab={setTab} t={t} />
      ))}
    </div>
  );
};

export default Tabs;
