import { useState, ReactNode } from "react";

import ShowMore from "Element/ShowMore";

interface CollapsedProps {
  text?: string
  children: ReactNode
}

const Collapsed = ({ text, children }: CollapsedProps) => {
  const [shown, setShown] = useState(false)
  return shown ? (
      <div className="uncollapsed">
        {children}
      </div> 
    ) : (
      <div className="collapsed">
        <ShowMore text={text} onClick={() => setShown(true)} />
      </div>
  )
}

export default Collapsed
