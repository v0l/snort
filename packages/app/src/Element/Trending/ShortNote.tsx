import { NostrLink, TaggedNostrEvent } from "@snort/system";
import ProfileImage from "@/Element/User/ProfileImage";
import Text from "@/Element/Text";
import { Link } from "react-router-dom";
import NoteTime from "@/Element/Event/NoteTime";

export default function ShortNote({ event }: { event: TaggedNostrEvent }) {
  return (
    <Link to={`/${NostrLink.fromEvent(event).encode(CONFIG.eventLinkPrefix)}`} className="flex flex-col">
      <div className="flex flex-row justify-between">
        <ProfileImage pubkey={event.pubkey} size={32} showNip05={false} />
        <NoteTime from={event.created_at * 1000} />
      </div>
      <div className="ml-10">
        <Text {...event} truncate={75} />
      </div>
    </Link>
  );
}
