import "./Note.css";

import { EventKind, NostrEvent, TaggedNostrEvent } from "@snort/system";
import { ReactNode } from "react";

import PubkeyList from "@/Components/Embed/PubkeyList";
import ZapstrEmbed from "@/Components/Embed/ZapstrEmbed";
import ErrorBoundary from "@/Components/ErrorBoundary";
import { NostrFileElement } from "@/Components/Event/NostrFileHeader";
import NoteReaction from "@/Components/Event/NoteReaction";
import { ZapGoal } from "@/Components/Event/ZapGoal";
import { LiveEvent } from "@/Components/LiveStream/LiveEvent";
import ProfilePreview from "@/Components/User/ProfilePreview";

import { LongFormText } from "./LongFormText";
import { NoteInner } from "./NoteInner";

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
  waitUntilInView?: boolean;
}

export default function Note(props: NoteProps) {
  const { data: ev, className } = props;

  let content;
  switch (ev.kind) {
    case EventKind.Repost:
      content = <NoteReaction data={ev} key={ev.id} root={undefined} depth={(props.depth ?? 0) + 1} />;
      break;
    case EventKind.FileHeader:
      content = <NostrFileElement ev={ev} />;
      break;
    case EventKind.ZapstrTrack:
      content = <ZapstrEmbed ev={ev} />;
      break;
    case EventKind.FollowSet:
    case EventKind.ContactList:
      content = <PubkeyList ev={ev} className={className} />;
      break;
    case EventKind.LiveEvent:
      content = <LiveEvent ev={ev} />;
      break;
    case EventKind.SetMetadata:
      content = <ProfilePreview actions={<></>} pubkey={ev.pubkey} />;
      break;
    case 9041: // Assuming 9041 is a valid EventKind
      content = <ZapGoal ev={ev} />;
      break;
    case EventKind.LongFormTextNote:
      content = (
        <LongFormText
          ev={ev}
          related={props.related}
          isPreview={props.options?.longFormPreview ?? false}
          onClick={() => props.onClick?.(ev)}
          truncate={props.options?.truncate}
        />
      );
      break;
    default:
      content = <NoteInner {...props} />;
  }

  return <ErrorBoundary>{content}</ErrorBoundary>;
}
