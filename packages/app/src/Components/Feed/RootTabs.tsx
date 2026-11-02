import { unwrap } from "@snort/shared"
import { EventKind } from "@snort/system"
import classNames from "classnames"
import { useEffect, useMemo, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { rootTabItems } from "@/Components/Feed/RootTabItems"
import useLogin from "@/Hooks/useLogin"
import usePreferences from "@/Hooks/usePreferences"

export function RootTabs({ base = "/" }: { base: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { publicKey: pubKey, tags } = useLogin(s => ({
    publicKey: s.publicKey,
    tags: s.state.getList(EventKind.InterestsList),
  }))
  const defaultRootTab = usePreferences(s => s.defaultRootTab)
  const rowRef = useRef<HTMLDivElement>(null)

  const hashTags = tags.filter(a => a.toEventTag()?.[0] === "t").map(a => unwrap(a.toEventTag())[1])
  const menuItems = useMemo(() => rootTabItems(base, pubKey, hashTags).filter(a => a.show), [base, pubKey, hashTags])

  const defaultPath = `${base}/${pubKey ? defaultRootTab : "trending/notes"}`
  const current = location.pathname === "/" || location.pathname === base ? defaultPath : location.pathname
  const hashtag = location.pathname.startsWith(`${base}/t/`)
    ? decodeURIComponent(location.pathname.split("/").pop() ?? "")
    : undefined

  useEffect(() => {
    rowRef.current
      ?.querySelector<HTMLElement>("[aria-current='page']")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [current])

  const tabClass = (active: boolean) =>
    classNames(
      "plain flex-none px-3 pt-4 pb-3 text-base font-semibold whitespace-nowrap border-b-2 -mb-px",
      active
        ? "text-white light:text-black border-primary"
        : "text-neutral-400 border-transparent hover:text-white light:hover:text-black",
    )

  return (
    <nav ref={rowRef} className="flex flex-1 min-w-0 overflow-x-auto hide-scrollbar px-2" aria-label="Feeds">
      {menuItems.map(a => (
        <button
          key={a.tab}
          type="button"
          aria-current={a.path === current ? "page" : undefined}
          className={tabClass(a.path === current)}
          onClick={() => {
            navigate(a.path)
            window.scrollTo({ top: 0, behavior: "instant" })
          }}
        >
          {a.label}
        </button>
      ))}
      {hashtag && (
        <button type="button" aria-current="page" className={tabClass(true)}>
          #{hashtag}
        </button>
      )}
    </nav>
  )
}
