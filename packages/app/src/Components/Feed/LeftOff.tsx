import { FormattedMessage, FormattedTime } from "react-intl"

import Icon from "@/Components/Icons/Icon"
import { scrollToLeftOff } from "@/Hooks/useLastRead"
import { useNotificationsView } from "@/Feed/WorkerRelayView"
import useLogin from "@/Hooks/useLogin"
import { useNavigate } from "react-router-dom"
import { useMemo, useState } from "react"

export function LeftOffDivider({ at }: { at: number }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-primary" data-left-off={at}>
      <span className="flex-1 h-px bg-primary/50" />
      <FormattedMessage
        defaultMessage="You left off here at {time}"
        values={{ time: <FormattedTime value={at * 1000} /> }}
      />
      <span className="flex-1 h-px bg-primary/50" />
    </div>
  )
}

function useUnreadReplies() {
  const { publicKey, readNotifications } = useLogin(s => ({
    publicKey: s.publicKey,
    readNotifications: s.readNotifications,
  }))
  const notifications = useNotificationsView()
  return useMemo(
    () =>
      notifications.filter(
        n =>
          (n.kind === 1 || n.kind === 1111) &&
          n.pubkey !== publicKey &&
          n.created_at * 1000 > readNotifications &&
          n.tags.some(t => t[0] === "p" && t[1] === publicKey),
      ).length,
    [notifications, publicKey, readNotifications],
  )
}

export function WelcomeBack({
  leftOffAt,
  newNotes,
  loadUntil,
}: {
  leftOffAt: number
  newNotes: number
  loadUntil: (t: number) => void
}) {
  const navigate = useNavigate()
  const replies = useUnreadReplies()
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || leftOffAt === 0 || (newNotes === 0 && replies === 0)) return null

  const jump = () => {
    if (scrollToLeftOff()) return
    loadUntil(leftOffAt)
    let tries = 0
    const timer = window.setInterval(() => {
      if (scrollToLeftOff() || tries++ > 30) window.clearInterval(timer)
    }, 200)
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 mx-3 my-2 pl-3.5 pr-2 py-2 border rounded-xl text-sm"
      role="status"
    >
      <div className="flex-1 min-w-[200px] text-neutral-400">
        <b className="text-white light:text-black font-semibold">
          <FormattedMessage defaultMessage="Welcome back." />
        </b>{" "}
        {replies > 0 ? (
          <FormattedMessage
            defaultMessage="{n, plural, =1 {# new note} other {# new notes}} since {time}, and {r, plural, =1 {# reply} other {# replies}} to you."
            values={{ n: newNotes, r: replies, time: <FormattedTime value={leftOffAt * 1000} /> }}
          />
        ) : (
          <FormattedMessage
            defaultMessage="{n, plural, =1 {# new note} other {# new notes}} since {time}."
            values={{ n: newNotes, time: <FormattedTime value={leftOffAt * 1000} /> }}
          />
        )}
      </div>
      <div className="flex items-center gap-1">
        {newNotes > 0 && (
          <button
            type="button"
            onClick={jump}
            className="plain px-2.5 py-1.5 rounded-lg font-semibold text-primary hover:bg-primary/15"
          >
            <FormattedMessage defaultMessage="Jump to where you left off" />
          </button>
        )}
        {replies > 0 && (
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="plain px-2.5 py-1.5 rounded-lg font-semibold text-primary hover:bg-primary/15"
          >
            <FormattedMessage defaultMessage="See replies" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="plain p-1.5 rounded-lg text-neutral-400 hover:bg-layer-2"
          aria-label="Dismiss"
          title="Dismiss"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  )
}
