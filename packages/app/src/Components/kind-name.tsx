import { FormattedMessage } from "react-intl";

export default function KindName({ kind }: { kind: number }) {
  switch (kind) {
    case 0:
      return <FormattedMessage defaultMessage="User Metadata" />;
    case 1:
      return <FormattedMessage defaultMessage="Short Text Note" />;
    case 2:
      return <FormattedMessage defaultMessage="Recommend Relay" />;
    case 3:
      return <FormattedMessage defaultMessage="Follows" />;
    case 4:
      return <FormattedMessage defaultMessage="Encrypted Direct Messages" />;
    case 5:
      return <FormattedMessage defaultMessage="Event Deletion Request" />;
    case 6:
      return <FormattedMessage defaultMessage="Repost" />;
    case 7:
      return <FormattedMessage defaultMessage="Reaction" />;
    case 8:
      return <FormattedMessage defaultMessage="Badge Award" />;
    case 9:
      return <FormattedMessage defaultMessage="Group Chat Message" />;
    case 10:
      return <FormattedMessage defaultMessage="Group Chat Threaded Reply" />;
    case 11:
      return <FormattedMessage defaultMessage="Group Thread" />;
    case 12:
      return <FormattedMessage defaultMessage="Group Thread Reply" />;
    case 13:
      return <FormattedMessage defaultMessage="Seal" />;
    case 14:
      return <FormattedMessage defaultMessage="Direct Message" />;
    case 16:
      return <FormattedMessage defaultMessage="Generic Repost" />;
    case 17:
      return <FormattedMessage defaultMessage="Reaction to a website" />;
    case 40:
      return <FormattedMessage defaultMessage="Channel Creation" />;
    case 41:
      return <FormattedMessage defaultMessage="Channel Metadata" />;
    case 42:
      return <FormattedMessage defaultMessage="Channel Message" />;
    case 43:
      return <FormattedMessage defaultMessage="Channel Hide Message" />;
    case 44:
      return <FormattedMessage defaultMessage="Channel Mute User" />;
    case 64:
      return <FormattedMessage defaultMessage="Chess (PGN)" />;
    case 818:
      return <FormattedMessage defaultMessage="Merge Requests" />;
    case 1021:
      return <FormattedMessage defaultMessage="Bid" />;
    case 1022:
      return <FormattedMessage defaultMessage="Bid confirmation" />;
    case 1040:
      return <FormattedMessage defaultMessage="OpenTimestamps" />;
    case 1059:
      return <FormattedMessage defaultMessage="Gift Wrap" />;
    case 1063:
      return <FormattedMessage defaultMessage="File Metadata" />;
    case 1311:
      return <FormattedMessage defaultMessage="Live Chat Message" />;
    case 1617:
      return <FormattedMessage defaultMessage="Patches" />;
    case 1621:
      return <FormattedMessage defaultMessage="Issues" />;
    case 1622:
      return <FormattedMessage defaultMessage="Replies" />;
    case 1971:
      return <FormattedMessage defaultMessage="Problem Tracker" />;
    case 1984:
      return <FormattedMessage defaultMessage="Reporting" />;
    case 1985:
      return <FormattedMessage defaultMessage="Label" />;
    case 1986:
      return <FormattedMessage defaultMessage="Relay reviews" />;
    case 1987:
      return <FormattedMessage defaultMessage="AI Embeddings / Vector lists" />;
    case 2003:
      return <FormattedMessage defaultMessage="Torrent" />;
    case 2004:
      return <FormattedMessage defaultMessage="Torrent Comment" />;
    case 2022:
      return <FormattedMessage defaultMessage="Coinjoin Pool" />;
    case 4550:
      return <FormattedMessage defaultMessage="Community Post Approval" />;
    case 7000:
      return <FormattedMessage defaultMessage="Job Feedback" />;
    case 9041:
      return <FormattedMessage defaultMessage="Zap Goal" />;
    case 9467:
      return <FormattedMessage defaultMessage="Tidal login" />;
    case 9734:
      return <FormattedMessage defaultMessage="Zap Request" />;
    case 9735:
      return <FormattedMessage defaultMessage="Zap" />;
    case 9802:
      return <FormattedMessage defaultMessage="Highlights" />;
    case 10000:
      return <FormattedMessage defaultMessage="Mute list" />;
    case 10001:
      return <FormattedMessage defaultMessage="Pin list" />;
    case 10002:
      return <FormattedMessage defaultMessage="Relay List Metadata" />;
    case 10003:
      return <FormattedMessage defaultMessage="Bookmark list" />;
    case 10004:
      return <FormattedMessage defaultMessage="Communities list" />;
    case 10005:
      return <FormattedMessage defaultMessage="Public chats list" />;
    case 10006:
      return <FormattedMessage defaultMessage="Blocked relays list" />;
    case 10007:
      return <FormattedMessage defaultMessage="Search relays list" />;
    case 10009:
      return <FormattedMessage defaultMessage="User groups" />;
    case 10015:
      return <FormattedMessage defaultMessage="Interests list" />;
    case 10030:
      return <FormattedMessage defaultMessage="User emoji list" />;
    case 10050:
      return <FormattedMessage defaultMessage="Relay list to receive DMs" />;
    case 10063:
      return <FormattedMessage defaultMessage="User server list" />;
    case 10096:
      return <FormattedMessage defaultMessage="File storage server list" />;
    case 13194:
      return <FormattedMessage defaultMessage="Wallet Info" />;
    case 21000:
      return <FormattedMessage defaultMessage="Lightning Pub RPC" />;
    case 22242:
      return <FormattedMessage defaultMessage="Client Authentication" />;
    case 23194:
      return <FormattedMessage defaultMessage="Wallet Request" />;
    case 23195:
      return <FormattedMessage defaultMessage="Wallet Response" />;
    case 24133:
      return <FormattedMessage defaultMessage="Nostr Connect" />;
    case 24242:
      return <FormattedMessage defaultMessage="Blobs stored on mediaservers" />;
    case 27235:
      return <FormattedMessage defaultMessage="HTTP Auth" />;
    case 30000:
      return <FormattedMessage defaultMessage="Follow sets" />;
    case 30001:
      return <FormattedMessage defaultMessage="Generic lists" />;
    case 30002:
      return <FormattedMessage defaultMessage="Relay sets" />;
    case 30003:
      return <FormattedMessage defaultMessage="Bookmark sets" />;
    case 30004:
      return <FormattedMessage defaultMessage="Curation sets" />;
    case 30005:
      return <FormattedMessage defaultMessage="Video sets" />;
    case 30007:
      return <FormattedMessage defaultMessage="Kind mute sets" />;
    case 30008:
      return <FormattedMessage defaultMessage="Profile Badges" />;
    case 30009:
      return <FormattedMessage defaultMessage="Badge Definition" />;
    case 30015:
      return <FormattedMessage defaultMessage="Interest sets" />;
    case 30017:
      return <FormattedMessage defaultMessage="Create or update a stall" />;
    case 30018:
      return <FormattedMessage defaultMessage="Create or update a product" />;
    case 30019:
      return <FormattedMessage defaultMessage="Marketplace UI/UX" />;
    case 30020:
      return <FormattedMessage defaultMessage="Product sold as an auction" />;
    case 30023:
      return <FormattedMessage defaultMessage="Long-form Content" />;
    case 30024:
      return <FormattedMessage defaultMessage="Draft Long-form Content" />;
    case 30030:
      return <FormattedMessage defaultMessage="Emoji sets" />;
    case 30040:
      return <FormattedMessage defaultMessage="Modular Article Header" />;
    case 30041:
      return <FormattedMessage defaultMessage="Modular Article Content" />;
    case 30063:
      return <FormattedMessage defaultMessage="Release artifact sets" />;
    case 30078:
      return <FormattedMessage defaultMessage="Application-specific Data" />;
    case 30311:
      return <FormattedMessage defaultMessage="Live Event" />;
    case 30315:
      return <FormattedMessage defaultMessage="User Statuses" />;
    case 30402:
      return <FormattedMessage defaultMessage="Classified Listing" />;
    case 30403:
      return <FormattedMessage defaultMessage="Draft Classified Listing" />;
    case 30617:
      return <FormattedMessage defaultMessage="Repository announcements" />;
    case 30618:
      return <FormattedMessage defaultMessage="Repository state announcements" />;
    case 30818:
      return <FormattedMessage defaultMessage="Wiki article" />;
    case 30819:
      return <FormattedMessage defaultMessage="Redirects" />;
    case 31890:
      return <FormattedMessage defaultMessage="Feed" />;
    case 31922:
      return <FormattedMessage defaultMessage="Date-Based Calendar Event" />;
    case 31923:
      return <FormattedMessage defaultMessage="Time-Based Calendar Event" />;
    case 31924:
      return <FormattedMessage defaultMessage="Calendar" />;
    case 31925:
      return <FormattedMessage defaultMessage="Calendar Event RSVP" />;
    case 31989:
      return <FormattedMessage defaultMessage="Handler recommendation" />;
    case 31990:
      return <FormattedMessage defaultMessage="Handler information" />;
    case 34235:
      return <FormattedMessage defaultMessage="Video Event" />;
    case 34236:
      return <FormattedMessage defaultMessage="Short-form Portrait Video Event" />;
    case 34237:
      return <FormattedMessage defaultMessage="Video View Event" />;
    case 34550:
      return <FormattedMessage defaultMessage="Community Definition" />;
  }
}
