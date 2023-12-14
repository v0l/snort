import "./Note.css";
import { ReactNode } from "react";
import { EventKind, NostrEvent, TaggedNostrEvent } from "@snort/system";
import { NostrFileElement } from "@/Element/Event/NostrFileHeader";
import ZapstrEmbed from "@/Element/Embed/ZapstrEmbed";
import PubkeyList from "@/Element/Embed/PubkeyList";
import { LiveEvent } from "@/Element/LiveEvent";
import { ZapGoal } from "@/Element/Event/ZapGoal";
import NoteReaction from "@/Element/Event/NoteReaction";
import ProfilePreview from "@/Element/User/ProfilePreview";
import { NoteInner } from "./NoteInner";
import { LongFormText } from "./LongFormText";
import ErrorBoundary from "@/Element/ErrorBoundary";

export interface NoteProps {
  data: TaggedNostrEvent;
  className?: string;
  related: readonly TaggedNostrEvent[];
  highlight?: boolean;
  ignoreModeration?: boolean;
  onClick?: (e: TaggedNostrEvent) => void;
  depth?: number;
  searchedValue?: string;
  threadChains?: Map<string, Array<NostrEvent>>;
  context?: ReactNode;
  options?: {
    isRoot?: boolean;
    showHeader?: boolean;
    showContextMenu?: boolean;
    showProfileCard?: boolean;
    showTime?: boolean;
    showPinned?: boolean;
    showBookmarked?: boolean;
    showFooter?: boolean;
    showReactionsLink?: boolean;
    showMedia?: boolean;
    canUnpin?: boolean;
    canUnbookmark?: boolean;
    canClick?: boolean;
    showMediaSpotlight?: boolean;
    longFormPreview?: boolean;
    truncate?: boolean;
  };
}

export default function Note(props: NoteProps) {
  const { data: ev, className } = props;
  let content;
  if (ev.kind === EventKind.Repost) {
    content = <NoteReaction data={ev} key={ev.id} root={undefined} depth={(props.depth ?? 0) + 1} />;
  }
  if (ev.kind === EventKind.FileHeader) {
    content = <NostrFileElement ev={ev} />;
  }
  if (ev.kind === EventKind.ZapstrTrack) {
    content = <ZapstrEmbed ev={ev} />;
  }
  if (ev.kind === EventKind.FollowSet || ev.kind === EventKind.ContactList) {
    content = <PubkeyList ev={ev} className={className} />;
  }
  if (ev.kind === EventKind.LiveEvent) {
    content = <LiveEvent ev={ev} />;
  }
  if (ev.kind === EventKind.SetMetadata) {
    content = <ProfilePreview actions={<></>} pubkey={ev.pubkey} />;
  }
  if (ev.kind === (9041 as EventKind)) {
    content = <ZapGoal ev={ev} />;
  }
  if (ev.kind === EventKind.LongFormTextNote) {
    content = (
      <LongFormText
        ev={ev}
        related={props.related}
        isPreview={props.options?.longFormPreview ?? false}
        onClick={() => props.onClick?.(ev)}
        truncate={props.options?.truncate}
      />
    );
  }

  content = <NoteInner {...props} />;
  return <ErrorBoundary>{content}</ErrorBoundary>;
}
