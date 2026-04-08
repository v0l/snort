import classNames from "classnames"
import { type ReactNode, useState } from "react"

import Icon from "@/Components/Icons/Icon"

interface CollapsedProps {
  text?: ReactNode
  children: ReactNode
  collapsed: boolean
  setCollapsed(b: boolean): void
}

const Collapsed = ({ text, children, collapsed, setCollapsed }: CollapsedProps) => {
  return collapsed ? (
    <button
      type="button"
      className="text-nostr-purple px-4 pb-3 cursor-pointer hover:underline bg-transparent border-0 p-0 m-0"
      onClick={() => setCollapsed(false)}
    >
      {text}
    </button>
  ) : (
    <div className="uncollapsed">{children}</div>
  )
}

interface CollapsedSectionProps {
  title: ReactNode
  children: ReactNode
  className?: string
  startClosed?: boolean
}

export const CollapsedSection = ({ title, children, className, startClosed }: CollapsedSectionProps) => {
  const [collapsed, setCollapsed] = useState(startClosed ?? true)
  return (
    <div>
      <button
        type="button"
        className={classNames(
          "flex gap-4 items-center justify-between cursor-pointer layer-1 select-none bg-transparent border-0 p-0 m-0",
          { "rounded-b-none": !collapsed },
          className,
        )}
        onClick={() => setCollapsed(!collapsed)}
      >
        {title}
        <Icon name="arrowFront" className={`transition-transform ${collapsed ? "rotate-90" : ""}`} />
      </button>
      {!collapsed && <div className="layer-2 rounded-t-none">{children}</div>}
    </div>
  )
}

export default Collapsed
