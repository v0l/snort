import { NostrPrefix } from "@snort/shared"
import { NostrLink, parseNostrLink } from "@snort/system"
import { useParams } from "react-router-dom"

import { ThreadElement } from "@/Components/Event/Thread/Thread"
import NotFoundPage from "@/Pages/NotFound"
import { ThreadContextWrapper } from "@/Utils/Thread/ThreadContextWrapper"

function toLink(id: string) {
  try {
    return parseNostrLink(id, NostrPrefix.Note)
  } catch {
    return undefined
  }
}

export function ThreadRoute({ id }: { id?: string | NostrLink }) {
  const params = useParams()
  const link = NostrLink.isInstance(id) ? id : toLink(id ?? params.id ?? "")
  if (!link) return <NotFoundPage />

  return (
    <ThreadContextWrapper link={link}>
      <ThreadElement />
    </ThreadContextWrapper>
  )
}
