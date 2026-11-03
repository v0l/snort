import type React from "react"
import { useCallback, useMemo } from "react"
import { FormattedMessage } from "react-intl"

import { useHydrated } from "@/Hooks/useHydrated"

export interface NoteTimeProps {
  from: number
  fallback?: string
  className?: string
}

const secondsInAMinute = 60
const secondsInAnHour = secondsInAMinute * 60
const secondsInADay = secondsInAnHour * 24

const NoteTime: React.FC<NoteTimeProps> = ({ from, fallback, className }) => {
  const hydrated = useHydrated()
  const calcTime = useCallback(
    (fromTime: number) => {
      const currentTime = new Date(Date.now())
      const timeDifference = Math.floor((currentTime.getTime() - fromTime) / 1000)

      if (timeDifference < secondsInAMinute) {
        return <FormattedMessage defaultMessage="now" />
      } else if (timeDifference < secondsInAnHour) {
        return `${Math.floor(timeDifference / secondsInAMinute)}m`
      } else if (timeDifference < secondsInADay) {
        return `${Math.floor(timeDifference / secondsInAnHour)}h`
      } else {
        const fromDate = new Date(fromTime)
        if (!hydrated) {
          return fromDate.toISOString().slice(0, 10)
        }
        if (fromDate.getFullYear() === currentTime.getFullYear()) {
          return fromDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        } else {
          return fromDate.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        }
      }
    },
    [hydrated],
  )

  const time = useMemo(() => calcTime(from), [calcTime, from])

  const absoluteTime = useMemo(
    () =>
      hydrated
        ? new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "long",
          }).format(from)
        : new Date(from).toISOString(),
    [from, hydrated],
  )

  const isoDate = useMemo(() => new Date(from).toISOString(), [from])

  return (
    <time dateTime={isoDate} title={absoluteTime} className={className ?? "text-sm text-neutral-500 font-medium"}>
      {time || fallback}
    </time>
  )
}

export default NoteTime
