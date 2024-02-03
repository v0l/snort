import SuggestedProfiles from "@/Components/SuggestedProfiles";
import TrendingHashtags from "@/Components/Trending/TrendingHashtags";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import Discover from "@/Pages/Discover";
import HashTagsPage from "@/Pages/HashTagsPage";
import { ConversationsTab } from "@/Pages/Root/ConversationsTab";
import { DefaultTab } from "@/Pages/Root/DefaultTab";
import { FollowedByFriendsTab } from "@/Pages/Root/FollowedByFriendsTab";
import { ForYouTab } from "@/Pages/Root/ForYouTab";
import { GlobalTab } from "@/Pages/Root/GlobalTab";
import { NotesTab } from "@/Pages/Root/NotesTab";
import { TagsTab } from "@/Pages/Root/TagsTab";
import { TopicsPage } from "@/Pages/TopicsPage";

export type RootTabRoutePath =
  | ""
  | "for-you"
  | "global"
  | "following"
  | "followed-by-friends"
  | "conversations"
  | "discover"
  | "tag/:tag"
  | "trending/notes"
  | "trending/hashtags"
  | "suggested"
  | "t/:tag"
  | "topics";

export type RootTabRoute = {
  path: RootTabRoutePath;
  element: JSX.Element;
};

export const RootTabRoutes: RootTabRoute[] = [
  {
    path: "",
    element: <DefaultTab />,
  },
  {
    path: "for-you",
    element: <ForYouTab />,
  },
  {
    path: "global",
    element: <GlobalTab />,
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
    element: <TrendingHashtags />,
  },
  {
    path: "suggested",
    element: (
      <div className="p">
        <SuggestedProfiles />
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
];
