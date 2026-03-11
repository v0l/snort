import type { RouteObject } from 'react-router-dom'

export type RootTabRoutePath =
  | ''
  | 'for-you'
  | 'following'
  | 'followed-by-friends'
  | 'conversations'
  | 'discover'
  | 'tag/:tag'
  | 'trending/notes'
  | 'trending/hashtags'
  | 'suggested'
  | 't/:tag'
  | 'topics'
  | 'media'
  | 'follow-sets'
  | 'relay'

export type RootTabRoute = RouteObject

export const RootTabRoutes: RootTabRoute[] = [
  {
    index: true,
    async lazy() {
      const { DefaultTab } = await import('@/Pages/Root/DefaultTab')
      return { Component: DefaultTab }
    },
  },
  {
    path: 'for-you',
    async lazy() {
      const { ForYouTab } = await import('@/Pages/Root/ForYouTab')
      return { Component: ForYouTab }
    },
  },
  {
    path: 'following',
    async lazy() {
      const { NotesTab } = await import('@/Pages/Root/NotesTab')
      return { Component: NotesTab }
    },
  },
  {
    path: 'followed-by-friends',
    async lazy() {
      const { FollowedByFriendsTab } = await import('@/Pages/Root/FollowedByFriendsTab')
      return { Component: FollowedByFriendsTab }
    },
  },
  {
    path: 'conversations',
    async lazy() {
      const { ConversationsTab } = await import('@/Pages/Root/ConversationsTab')
      return { Component: ConversationsTab }
    },
  },
  {
    path: 'discover',
    async lazy() {
      const { default: Discover } = await import('@/Pages/Discover')
      return { Component: Discover }
    },
  },
  {
    path: 'tag/:tag',
    async lazy() {
      const { TagsTab } = await import('@/Pages/Root/TagsTab')
      return { Component: TagsTab }
    },
  },
  {
    path: 'trending/notes',
    async lazy() {
      const { default: TrendingNotes } = await import('@/Components/Trending/TrendingPosts')
      return { Component: TrendingNotes }
    },
  },
  {
    path: 'trending/hashtags',
    async lazy() {
      const { default: TrendingHashtags } = await import('@/Components/Trending/TrendingHashtags')
      const Wrapper = () => (
        <div className="px-2">
          <TrendingHashtags />
        </div>
      )
      return { Component: Wrapper }
    },
  },
  {
    path: 't/:tag',
    async lazy() {
      const { default: HashTagsPage } = await import('@/Pages/HashTagsPage')
      return { Component: HashTagsPage }
    },
  },
  {
    path: 'topics',
    async lazy() {
      const { TopicsPage } = await import('@/Pages/TopicsPage')
      return { Component: TopicsPage }
    },
  },
  {
    path: 'media',
    async lazy() {
      const { default: MediaPosts } = await import('@/Pages/Root/Media')
      return { Component: MediaPosts }
    },
  },
  {
    path: 'follow-sets',
    async lazy() {
      const { default: FollowSetsPage } = await import('@/Pages/Root/FollowSets')
      return { Component: FollowSetsPage }
    },
  },
  {
    path: 'relay/:relay?',
    async lazy() {
      const { default: RelayFeedPage } = await import('@/Pages/Root/RelayFeedPage')
      return { Component: RelayFeedPage }
    },
  },
  {
    path: 'suggested',
    async lazy() {
      const { default: SuggestedProfiles } = await import('@/Components/SuggestedProfiles')
      return { Component: SuggestedProfiles }
    },
  },
]
