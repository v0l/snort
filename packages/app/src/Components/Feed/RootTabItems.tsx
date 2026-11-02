import type { ReactNode } from "react"
import { FormattedMessage } from "react-intl"

import Icon from "@/Components/Icons/Icon"
import type { RootTabRoutePath } from "@/Pages/Root/RootTabRoutes"

export function rootTabItems(base: string, pubKey: string | undefined, tags: Array<string>) {
  const menuItems = [
    {
      tab: "for-you",
      path: `${base}/for-you`,
      show: Boolean(pubKey),
      label: <FormattedMessage defaultMessage="For you" />,
      element: (
        <>
          <Icon name="user-v2" />
          <FormattedMessage defaultMessage="For you" />
        </>
      ),
    },
    {
      tab: "following",
      path: `${base}/following`,
      show: Boolean(pubKey),
      label: <FormattedMessage defaultMessage="Following" />,
      element: (
        <>
          <Icon name="user-v2" />
          <FormattedMessage defaultMessage="Following" />
        </>
      ),
    },
    {
      tab: "trending/notes",
      path: `${base}/trending/notes`,
      show: true,
      label: <FormattedMessage defaultMessage="Trending Notes" />,
      element: (
        <>
          <Icon name="fire" />
          <FormattedMessage defaultMessage="Trending Notes" />
        </>
      ),
    },
    {
      tab: "conversations",
      path: `${base}/conversations`,
      show: Boolean(pubKey),
      label: <FormattedMessage defaultMessage="Conversations" />,
      element: (
        <>
          <Icon name="message-chat-circle" />
          <FormattedMessage defaultMessage="Conversations" />
        </>
      ),
    },
    {
      tab: "followed-by-friends",
      path: `${base}/followed-by-friends`,
      show: Boolean(pubKey),
      label: <FormattedMessage defaultMessage="Followed by friends" />,
      element: (
        <>
          <Icon name="user-v2" />
          <FormattedMessage defaultMessage="Followed by friends" />
        </>
      ),
    },
    {
      tab: "trending/hashtags",
      path: `${base}/trending/hashtags`,
      show: true,
      label: <FormattedMessage defaultMessage="Trending Hashtags" />,
      element: (
        <>
          <Icon name="hash" />
          <FormattedMessage defaultMessage="Trending Hashtags" />
        </>
      ),
    },
    {
      tab: "tags",
      path: `${base}/topics`,
      show: tags.length > 0,
      label: <FormattedMessage defaultMessage="Topics" />,
      element: (
        <>
          <Icon name="hash" />
          <FormattedMessage defaultMessage="Topics" />
        </>
      ),
    },
    {
      tab: "media",
      path: `${base}/media`,
      show: true,
      label: <FormattedMessage defaultMessage="Media" />,
      element: (
        <>
          <Icon name="camera-plus" />
          <FormattedMessage defaultMessage="Media" />
        </>
      ),
    },
    {
      tab: "follow-sets",
      path: `${base}/follow-sets`,
      show: true,
      label: <FormattedMessage defaultMessage="Follow Sets" />,
      element: (
        <>
          <Icon name="thumbs-up" />
          <FormattedMessage defaultMessage="Follow Sets" />
        </>
      ),
    },
  ] as Array<{
    tab: RootTabRoutePath
    path: string
    show: boolean
    label: ReactNode
    element: ReactNode
  }>
  return menuItems
}
