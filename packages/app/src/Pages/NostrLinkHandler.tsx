import { fetchNip05Pubkey, NostrPrefix } from "@snort/shared"
import { tryParseNostrLink } from "@snort/system"
import { useCallback, useEffect, useState } from "react"
import { FormattedMessage } from "react-intl"
import { useLocation, useParams } from "react-router-dom"

import { ThreadRoute } from "@/Components/Event/Thread/ThreadRoute"
import Spinner from "@/Components/Icons/Spinner"
import ProfilePage from "@/Pages/Profile/ProfilePage"

export default function NostrLinkHandler() {
  const { state } = useLocation()
  const { link } = useParams()

  const determineInitialComponent = useCallback(
    (link: string | undefined) => {
      const nav = link ? tryParseNostrLink(link) : undefined
      if (nav) {
        switch (nav.type) {
          case NostrPrefix.Event:
          case NostrPrefix.Note:
          case NostrPrefix.Address:
            return <ThreadRoute key={link} id={nav.encode()} />
          case NostrPrefix.PublicKey:
          case NostrPrefix.Profile:
            return <ProfilePage key={link} id={nav.encode()} state={state} />
          default:
            return null
        }
      } else {
        return state ? <ProfilePage key={link} state={state} /> : null
      }
    },
    [state],
  )

  const [loading, setLoading] = useState(() => !determineInitialComponent(link))
  const [renderComponent, setRenderComponent] = useState(() => determineInitialComponent(link))

  const handleLink = useCallback(
    async (link: string | undefined) => {
      if (link && !tryParseNostrLink(link)) {
        try {
          const pubkey = await fetchNip05Pubkey(link, CONFIG.nip05Domain)
          if (pubkey) {
            setRenderComponent(<ProfilePage key={link} id={pubkey} state={state} />)
          }
        } catch {
          // Ignored
        }
        setLoading(false)
      }
    },
    [state],
  )

  useEffect(() => {
    setRenderComponent(determineInitialComponent(link))
    handleLink(link)
  }, [link, determineInitialComponent, handleLink])

  if (renderComponent) {
    return renderComponent
  }

  return (
    <div className="flex items-center">
      {loading ? (
        <Spinner width={50} height={50} />
      ) : (
        <b className="error">
          <FormattedMessage defaultMessage="Nothing found :/" />
        </b>
      )}
    </div>
  )
}
