import { useState, ReactNode } from "react";

import ChevronDown from "Icons/ChevronDown";
import ShowMore from "Element/ShowMore";

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
  children: ReactNode;
  collapsed: boolean;
}

export const CollapsedIcon = ({ icon, children, collapsed }: CollapsedIconProps) => {
  return collapsed ? (
    <div className="collapsed">{icon}</div>
  ) : (
    <div className="uncollapsed">
      {icon}
      {children}
    </div>
  );
};

interface CollapsedSectionProps {
  title: ReactNode;
  children: ReactNode;
}

export const CollapsedSection = ({ title, children }: CollapsedSectionProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const icon = (
    <div className={`collapse-icon ${collapsed ? "" : "flip"}`} onClick={() => setCollapsed(!collapsed)}>
      <ChevronDown />
    </div>
  );
  return (
    <div className="collapsable-section">
      <h3 onClick={() => setCollapsed(!collapsed)}>{title}</h3>
      <CollapsedIcon icon={icon} collapsed={collapsed}>
        {children}
      </CollapsedIcon>
    </div>
  );
};

export default Collapsed;
