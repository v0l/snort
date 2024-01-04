import { useState, ReactNode } from "react";
import classNames from "classnames";

import Icon from "@/Components/Icons/Icon";
import ShowMore from "@/Components/Event/ShowMore";

interface CollapsedProps {
  text?: string;
  children: ReactNode;
  collapsed: boolean;
  setCollapsed(b: boolean): void;
}

const Collapsed = ({ text, children, collapsed, setCollapsed }: CollapsedProps) => {
  return collapsed ? (
    <div className="collapsed">
      <ShowMore text={text} onClick={() => setCollapsed(false)} />
    </div>
  ) : (
    <div className="uncollapsed">{children}</div>
  );
};

interface CollapsedIconProps {
  icon: ReactNode;
  collapsed: boolean;
}

export const CollapsedIcon = ({ icon, collapsed }: CollapsedIconProps) => {
  return collapsed ? <div className="collapsed">{icon}</div> : <div className="uncollapsed">{icon}</div>;
};

interface CollapsedSectionProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

export const CollapsedSection = ({ title, children, className }: CollapsedSectionProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const icon = (
    <div className={classNames("collapse-icon", { flip: !collapsed })}>
      <Icon name="arrowFront" />
    </div>
  );
  return (
    <>
      <div className={classNames("collapsable-section", className)} onClick={() => setCollapsed(!collapsed)}>
        {title}
        <CollapsedIcon icon={icon} collapsed={collapsed} />
      </div>
      {!collapsed && children}
    </>
  );
};

export default Collapsed;
