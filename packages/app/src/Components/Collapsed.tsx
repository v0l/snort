import classNames from "classnames";
import { ReactNode, useState } from "react";

import Icon from "@/Components/Icons/Icon";

interface CollapsedProps {
  text?: ReactNode;
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

interface CollapsedSectionProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  startClosed?: boolean;
}

export const CollapsedSection = ({ title, children, className, startClosed }: CollapsedSectionProps) => {
  const [collapsed, setCollapsed] = useState(startClosed ?? true);
  return (
    <>
      <div
        className={classNames("flex gap-4 items-center justify-between cursor-pointer", className)}
        onClick={() => setCollapsed(!collapsed)}>
        {title}
        <Icon name="arrowFront" className={`transition-transform ${collapsed ? "rotate-90" : ""}`} />
      </div>
      {!collapsed && children}
    </>
  );
};

export default Collapsed;
