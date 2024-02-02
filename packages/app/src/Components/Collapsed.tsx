import classNames from "classnames";
import { ReactNode, useState } from "react";

import Icon from "@/Components/Icons/Icon";

interface CollapsedProps {
  text?: string;
  children: ReactNode;
  collapsed: boolean;
  setCollapsed(b: boolean): void;
}

const Collapsed = ({ text, children, collapsed, setCollapsed }: CollapsedProps) => {
  return collapsed ? (
    <div className="text-nostr-purple px-4 pb-3 cursor-pointer hover:underline" onClick={() => setCollapsed(false)}>
      {text}
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
