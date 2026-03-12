import { useUserProfile } from "@snort/system-react"
import { useRef } from "react"

import DisplayName from "./DisplayName"
import { ProfileLink } from "./ProfileLink"

export default function Username({ pubkey, onLinkVisit }: { pubkey: string; onLinkVisit?(): void }) {
  const ref = useRef<HTMLSpanElement>(null)
  const user = useUserProfile(pubkey, ref)

  return (
    <span ref={ref}>
      <ProfileLink pubkey={pubkey} onClick={onLinkVisit} user={user}>
        <DisplayName pubkey={pubkey} user={user} />
      </ProfileLink>
    </span>
  )
}
