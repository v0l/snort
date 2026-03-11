import { NostrPrefix } from '@snort/shared'
import type { NostrLink } from '@snort/system'
import { useUserProfile } from '@snort/system-react'
import classNames from 'classnames'
import { type ReactNode, useRef } from 'react'
import DisplayName from '@/Components/User/DisplayName'
import { ProfileCardWrapper } from '@/Components/User/ProfileCardWrapper'
import { ProfileLink } from '@/Components/User/ProfileLink'

export default function Mention({
  link,
  prefix,
  className,
}: {
  link: NostrLink
  prefix?: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const profile = useUserProfile(link.id, ref)

  if (link.type !== NostrPrefix.Profile && link.type !== NostrPrefix.PublicKey) return

  return (
    <ProfileCardWrapper pubkey={link.id} user={profile}>
      <span ref={ref} className={classNames('text-highlight', className)}>
        <ProfileLink pubkey={link.id} user={profile} onClick={e => e.stopPropagation()}>
          {prefix ?? '@'}
          <DisplayName user={profile} pubkey={link.id} />
        </ProfileLink>
      </span>
    </ProfileCardWrapper>
  )
}
