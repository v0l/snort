import {TaggedNostrEvent} from "@snort/system";

export interface NoteTranslation {
  text: string;
  fromLanguage: string;
  confidence: number;
  skipped?: boolean;
}

export interface NoteContextMenuProps {
  ev: TaggedNostrEvent;

  setShowReactions(b: boolean): void;

  react(content: string): Promise<void>;

  onTranslated?: (t: NoteTranslation) => void;
}