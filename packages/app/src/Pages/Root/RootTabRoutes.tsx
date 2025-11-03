import TrendingHashtags from "@/Components/Trending/TrendingHashtags";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import Discover from "@/Pages/Discover";
import HashTagsPage from "@/Pages/HashTagsPage";
import { ConversationsTab } from "@/Pages/Root/ConversationsTab";
import { DefaultTab } from "@/Pages/Root/DefaultTab";
import { FollowedByFriendsTab } from "@/Pages/Root/FollowedByFriendsTab";
import FollowSetsPage from "@/Pages/Root/FollowSets";
import { ForYouTab } from "@/Pages/Root/ForYouTab";
import MediaPosts from "@/Pages/Root/Media";
import { NotesTab } from "@/Pages/Root/NotesTab";
import { TagsTab } from "@/Pages/Root/TagsTab";
import { TopicsPage } from "@/Pages/TopicsPage";
import { ReactElement } from "react";
import RelayFeedPage from "@/Pages/Root/RelayFeedPage";
import { RouteObject } from "react-router-dom";
import SuggestedProfiles from "@/Components/SuggestedProfiles";

export type RootTabRoutePath =
  | ""
  | "for-you"
  | "following"
  | "followed-by-friends"
  | "conversations"
  | "discover"
  | "tag/:tag"
  | "trending/notes"
  | "trending/hashtags"
  | "suggested"
  | "t/:tag"
  | "topics"
  | "media"
  | "follow-sets"
  | "relay";

export type RootTabRoute = {
  element: ReactElement;
} & RouteObject;

export const RootTabRoutes: RootTabRoute[] = [
  {
    index: true,
    element: <DefaultTab />,
  },
  {
    path: "for-you",
    element: <ForYouTab />,
  },
  {
    path: "following",
    element: <NotesTab />,
  },
  {
    path: "followed-by-friends",
    element: <FollowedByFriendsTab />,
  },
  {
    path: "conversations",
    element: <ConversationsTab />,
  },
  {
    path: "discover",
    element: <Discover />,
  },
  {
    path: "tag/:tag",
    element: <TagsTab />,
  },
  {
    path: "trending/notes",
    element: <TrendingNotes />,
  },
  {
    path: "trending/hashtags",
    element: (
      <div className="px-2">
        <TrendingHashtags />
      </div>
    ),
  },
  {
    path: "t/:tag",
    element: <HashTagsPage />,
  },
  {
    path: "topics",
    element: <TopicsPage />,
  },
  {
    path: "media",
    element: <MediaPosts />,
  },
  {
    path: "follow-sets",
    element: <FollowSetsPage />,
  },
  {
    path: "relay/:relay?",
    element: <RelayFeedPage />,
  },
  {
    path: "suggested",
    element: <SuggestedProfiles />,
  },
];
