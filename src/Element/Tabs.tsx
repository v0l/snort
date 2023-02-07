import './Tabs.css'

import useHorizontalScroll from "Hooks/useHorizontalScroll";

export interface Tab {
  text: string, value: number
}

interface TabsProps {
  tabs: Tab[]
  tab: Tab
  setTab: (t: Tab) => void
}

interface TabElementProps extends Omit<TabsProps, 'tabs'> {
  t: Tab
}

export const TabElement = ({ t, tab, setTab }: TabElementProps) => {
  return (
    <div className={`tab ${tab.value === t.value ? "active" : ""}`} onClick={() => setTab(t)}>
      {t.text}
    </div>
  )
}

const Tabs = ({ tabs, tab, setTab }: TabsProps) => {
  const horizontalScroll = useHorizontalScroll()
  return (
    <div className="tabs" ref={horizontalScroll}>
      {tabs.map((t) => {
        return (
          <div key={t.value} className={`tab ${tab.value === t.value ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.text}
          </div>
        )
      })}
    </div>
  )
}

export default Tabs
