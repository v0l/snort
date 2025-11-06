export interface NoteTranslation {
  text: string;
  fromLanguage: string;
  confidence: number;
  skipped?: boolean;
}
