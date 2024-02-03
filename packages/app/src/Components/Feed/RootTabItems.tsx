import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import { RootTabRoutePath } from "@/Pages/Root/RootTabRoutes";
import { Newest } from "@/Utils/Login";

export function rootTabItems(base: string, pubKey: string | undefined, tags: Newest<Array<string>>) {
  const menuItems = [
    {
      tab: "for-you",
      path: `${base}/for-you`,
      show: Boolean(pubKey) && CONFIG.features.forYouFeed,
      element: (
        <>
          <Icon name="user-v2" />
          <FormattedMessage defaultMessage="For you" id="xEjBS7" />
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
          <FormattedMessage defaultMessage="Following" id="cPIKU2" />
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
          <FormattedMessage defaultMessage="Trending Notes" id="Ix8l+B" />
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
          <FormattedMessage defaultMessage="Conversations" id="1udzha" />
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
          <FormattedMessage defaultMessage="Followed by friends" id="voxBKC" />
        </>
      ),
    },
    {
      tab: "suggested",
      path: `${base}/suggested`,
      show: Boolean(pubKey),
      element: (
        <>
          <Icon name="thumbs-up" />
          <FormattedMessage defaultMessage="Suggested Follows" id="C8HhVE" />
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
          <FormattedMessage defaultMessage="Trending Hashtags" id="XXm7jJ" />
        </>
      ),
    },
    {
      tab: "global",
      path: `${base}/global`,
      show: true,
      element: (
        <>
          <Icon name="globe" />
          <FormattedMessage defaultMessage="Global" id="EWyQH5" />
        </>
      ),
    },
    {
      tab: "tags",
      path: `${base}/topics`,
      show: tags.item.length > 0,
      element: (
        <>
          <Icon name="hash" />
          <FormattedMessage defaultMessage="Topics" id="kc79d3" />
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
