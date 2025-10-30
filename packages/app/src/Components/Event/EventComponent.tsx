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

  function inner() {
    switch (ev.kind) {
      case EventKind.Reaction:
      case EventKind.Repost:
        return <NoteReaction data={ev} key={ev.id} root={undefined} depth={(props.depth ?? 0) + 1} />;
      case EventKind.FileHeader:
        return <NostrFileElement ev={ev} />;
      case EventKind.ZapstrTrack:
        return <ZapstrEmbed ev={ev} />;
      case EventKind.StarterPackSet:
      case EventKind.FollowSet:
      case EventKind.ContactList:
        return <PubkeyList ev={ev} className={className} />;
      case EventKind.LiveEvent:
        return <LiveEvent ev={ev} />;
      case EventKind.SetMetadata:
        return <ProfilePreview actions={<></>} pubkey={ev.pubkey} />;
      case 9041: // Assuming 9041 is a valid EventKind
        return <ZapGoal ev={ev} />;
      case EventKind.ApplicationHandler: {
        return <ApplicationHandler ev={ev} />;
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
        return <Note {...props} />;
      }
      case EventKind.LongFormTextNote:
        return (
          <LongFormText
            ev={ev}
            isPreview={props.options?.longFormPreview ?? false}
            onClick={() => props.onClick?.(ev)}
            truncate={props.options?.truncate}
          />
        );
      default:
        return <Note {...props} />;
    }
  }
  return <ErrorBoundary>{inner()}</ErrorBoundary>;
}
