import { EventKind, NostrEvent, parseIMeta, TaggedNostrEvent } from "@snort/system";
import { ReactNode } from "react";

import PubkeyList from "@/Components/Embed/PubkeyList";
import ZapstrEmbed from "@/Components/Embed/ZapstrEmbed";
import ErrorBoundary from "@/Components/ErrorBoundary";
import { ApplicationHandler } from "@/Components/Event/Application";
import { LongFormText } from "@/Components/Event/LongFormText";
import { NostrFileElement } from "@/Components/Event/NostrFileHeader";
import { Note } from "@/Components/Event/Note/Note";
import NoteReaction from "@/Components/Event/NoteReaction";
import { ZapGoal } from "@/Components/Event/ZapGoal";
import { LiveEvent } from "@/Components/LiveStream/LiveEvent";
import ProfilePreview from "@/Components/User/ProfilePreview";

export interface NotePropsOptions {
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
  threadLines?: {
    /** The inset value from the left side of the note */
    inset: string;
    /** Renders the line joining to the previous note */
    topLine?: boolean;
    /** Renders the line joining to the next note */
    bottomLine?: boolean;
  };
}

export interface NoteProps {
  data: TaggedNostrEvent;
  className?: string;
  highlight?: boolean;
  ignoreModeration?: boolean;
  onClick?: (e: TaggedNostrEvent) => void;
  depth?: number;
  highlightText?: string;
  threadChains?: Map<string, Array<string>>;
  context?: ReactNode;
  options?: NotePropsOptions;
  waitUntilInView?: boolean;
  /**
   * Special classname to apply to the note text and footer
   */
  inset?: string;
}

export default function EventComponent(props: NoteProps) {
  const { data: ev, className } = props;

  let content;
  switch (ev.kind) {
    case EventKind.Reaction:
    case EventKind.Repost:
      content = <NoteReaction data={ev} key={ev.id} root={undefined} depth={(props.depth ?? 0) + 1} />;
      break;
    case EventKind.FileHeader:
      content = <NostrFileElement ev={ev} />;
      break;
    case EventKind.ZapstrTrack:
      content = <ZapstrEmbed ev={ev} />;
      break;
    case EventKind.StarterPackSet:
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
    case EventKind.ApplicationHandler: {
      content = <ApplicationHandler ev={ev} />;
      break;
    }
    case EventKind.Photo:
    case EventKind.Video:
    case EventKind.ShortVideo: {
      // append media to note as if kind1 post
      const media = parseIMeta(ev.tags);
      // Sometimes we cann call this twice so check the URL's are not already
      // in the content
      const urls = Object.entries(media ?? {}).map(([k]) => k);
      if (!urls.every(u => ev.content.includes(u))) {
        const newContent = ev.content + " " + urls.join("\n");
        props.data.content = newContent;
      }
      content = <Note {...props} />;
      break;
    }
    case EventKind.LongFormTextNote:
      content = (
        <LongFormText
          ev={ev}
          isPreview={props.options?.longFormPreview ?? false}
          onClick={() => props.onClick?.(ev)}
          truncate={props.options?.truncate}
        />
      );
      break;
    default:
      content = <Note {...props} />;
  }

  return <ErrorBoundary>{content}</ErrorBoundary>;
}
