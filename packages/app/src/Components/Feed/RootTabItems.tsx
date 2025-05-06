import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import { RootTabRoutePath } from "@/Pages/Root/RootTabRoutes";

export function rootTabItems(base: string, pubKey: string | undefined, tags: Array<string>) {
  const menuItems = [
    {
      tab: "for-you",
      path: `${base}/for-you`,
      show: Boolean(pubKey),
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
      element: (
        <>
          <Icon name="thumbs-up" />
          <FormattedMessage defaultMessage="Follow Sets" />
        </>
      ),
    },
  ] as Array<{
    tab: RootTabRoutePath;
    path: string;
    show: boolean;
    element: ReactNode;
  }>;
  return menuItems;
}
