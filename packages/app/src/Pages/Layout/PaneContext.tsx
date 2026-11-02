import { createContext, use } from "react"

import type { PaneEntry } from "./panes"

export interface PaneControls {
  entry?: PaneEntry
  closeFrom: (index: number) => void
  focus: (index: number) => void
}

export const PaneContext = createContext<PaneControls | undefined>(undefined)

export function usePanes() {
  return use(PaneContext)
}

export const PaneSourceAttr = "data-pane-index"

let lastSource = -1
let lastSourceAt = 0

export function setPaneSource(index: number) {
  lastSource = index
  lastSourceAt = Date.now()
}

export function recordPaneSource(target: EventTarget | null) {
  const el = target instanceof Element ? target.closest(`[${PaneSourceAttr}]`) : null
  setPaneSource(el ? Number(el.getAttribute(PaneSourceAttr)) : -1)
}

export function takePaneSource() {
  const fresh = Date.now() - lastSourceAt < 2000
  const s = fresh ? lastSource : -1
  lastSource = -1
  return s
}
