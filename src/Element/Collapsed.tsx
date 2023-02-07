import { ReactNode } from "react";

import ShowMore from "Element/ShowMore";

interface CollapsedProps {
  text?: string;
  children: ReactNode;
  collapsed: boolean;
  setCollapsed(b: boolean): void;
}

const Collapsed = ({
  text,
  children,
  collapsed,
  setCollapsed,
}: CollapsedProps) => {
  return collapsed ? (
    <div className="collapsed">
      <ShowMore text={text} onClick={() => setCollapsed(false)} />
    </div>
  ) : (
    <div className="uncollapsed">{children}</div>
  );
};

export default Collapsed;
