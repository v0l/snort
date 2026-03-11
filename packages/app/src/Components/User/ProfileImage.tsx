import type { UserMetadata } from '@snort/system'
import { useUserProfile } from '@snort/system-react'
import classNames from 'classnames'
import type React from 'react'
import { type ReactNode, useRef } from 'react'

import Avatar from '@/Components/User/Avatar'
import FollowDistanceIndicator from '@/Components/User/FollowDistanceIndicator'

import DisplayName from './DisplayName'
import Nip05 from './Nip05'
import { ProfileCardWrapper } from './ProfileCardWrapper'
import { ProfileLink } from './ProfileLink'

export interface ProfileImageProps {
  pubkey: string
  subHeader?: ReactNode
  showUsername?: boolean
  className?: string
  link?: string
  defaultNip?: string
  verifyNip?: boolean
  overrideUsername?: ReactNode
  profile?: UserMetadata
  size?: number
  onClick?: (e: React.MouseEvent) => void
  imageOverlay?: ReactNode
  showFollowDistance?: boolean
  icons?: ReactNode
  showProfileCard?: boolean
  displayNameClassName?: string
  showNip05?: boolean
}

export default function ProfileImage({
  pubkey,
  subHeader,
  showUsername = true,
  className,
  link,
  overrideUsername,
  profile,
  size,
  imageOverlay,
  onClick,
  showFollowDistance = true,
  icons,
  showProfileCard = false,
  displayNameClassName,
  showNip05 = true,
}: ProfileImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const user = useUserProfile(profile ? '' : pubkey, ref) ?? profile

  function handleClick(e: React.MouseEvent) {
    if (link === '') {
      e.preventDefault()
      onClick?.(e)
    }
  }

  function inner() {
    const avatar = (
      <Avatar
        pubkey={pubkey}
        user={user}
        size={size}
        imageOverlay={imageOverlay}
        showTitle={!showProfileCard}
        icons={
          showFollowDistance || icons ? (
            <>
              {icons}
              {showFollowDistance && <FollowDistanceIndicator pubkey={pubkey} />}
            </>
          ) : undefined
        }
      ></Avatar>
    )

    return (
      <>
        {showProfileCard ? (
          <ProfileCardWrapper pubkey={pubkey} user={user}>
            {avatar}
          </ProfileCardWrapper>
        ) : (
          avatar
        )}
        {showUsername && (
          <div className={displayNameClassName}>
            <div className="font-medium">
              {overrideUsername ? overrideUsername : <DisplayName pubkey={pubkey} user={user} />}
              {user?.nip05 && CONFIG.showNip05 && showNip05 && (
                <>
                  &nbsp;
                  <Nip05 nip05={user?.nip05} pubkey={pubkey} showBadges={true} className="text-xs" />
                </>
              )}
            </div>
            {subHeader}
          </div>
        )}
      </>
    )
  }

  const classNamesOverInner = classNames(
    'min-w-0 z-2',
    {
      'flex gap-2 items-center': showUsername,
    },
    className,
  )

  const content =
    link === '' ? (
      <div ref={ref} className={classNamesOverInner} onClick={handleClick}>
        {inner()}
      </div>
    ) : (
      <div ref={ref} className="contents">
        <ProfileLink
          pubkey={pubkey}
          user={user}
          explicitLink={link}
          className={classNamesOverInner}
          onClick={handleClick}
        >
          {inner()}
        </ProfileLink>
      </div>
    )

  return content
}
