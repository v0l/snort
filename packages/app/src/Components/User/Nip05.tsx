import { fetchNip05PubkeyWithThrow } from "@snort/shared"
import { useCached, useUserProfile } from "@snort/system-react"
import classNames from "classnames"
import { useCallback, useRef } from "react"
import { useInView } from "react-intersection-observer"
import { Day } from "@/Utils/Const"
import Icon from "../Icons/Icon"

export interface Nip05Params {
  className?: string
  nip05?: string
  pubkey?: string
  /**
   * Force the handle as verified, for display purposes
   */
  forceVerified?: boolean

  /**
   * Show verification badges
   */
  showBadges?: boolean
}

export default function Nip05({ nip05, pubkey, forceVerified, showBadges, className }: Nip05Params) {
  const { inView, ref: inViewRef } = useInView({ triggerOnce: true })
  const spanRef = useRef<HTMLSpanElement>(null)
  const profile = useUserProfile(pubkey && !nip05 ? pubkey : undefined, spanRef)
  const toSplit = nip05 ?? profile?.nip05

  const [name, domain] = toSplit ? toSplit.toLocaleLowerCase().split("@") : []
  const isDefaultUser = name === "_"
  const loader = useCallback(async () => {
    return await fetchNip05PubkeyWithThrow(name, domain)
  }, [name, domain])
  const { data, error } = useCached(toSplit && inView && pubkey ? `nip5:${toSplit}` : undefined, loader, Day)

  const canVerify = pubkey !== undefined
  const isVerified = (forceVerified ?? false) || (data === pubkey && canVerify)
  const isSpecialDomain =
    domain?.toLowerCase() === "snort.social" || domain?.toLowerCase() === CONFIG.nip05Domain.toLowerCase()

  return (
    <span
      className={classNames(
        "inline-flex items-center text-neutral-400 font-normal",
        { "opacity-50": !isVerified },
        className,
      )}
      ref={el => {
        spanRef.current = el
        inViewRef(el)
      }}
      title={error?.message}
    >
      {!isDefaultUser && <span className="nick">{`${name}@`}</span>}
      <span className={`${isSpecialDomain && isVerified ? "text-snort-gradient" : "text-neutral-400"}`}>{domain}</span>
      {(showBadges ?? false) && !isVerified && (
        <Icon
          size={13}
          name={isVerified ? "check" : "x"}
          className={classNames("ml-0.5", isVerified ? "text-success" : "text-error")}
        />
      )}
    </span>
  )
}
