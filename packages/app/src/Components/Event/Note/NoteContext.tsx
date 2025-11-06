import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { useEventReactions, useReactions } from "@snort/system-react";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LRUCache } from "typescript-lru-cache";

import useModeration from "@/Hooks/useModeration";

import { NoteTranslation } from "./types";
import SnortApi from "@/External/SnortApi";
import usePreferences from "@/Hooks/usePreferences";
import ReactionsModal from "./ReactionsModal";

const translationCache = new LRUCache<string, NoteTranslation>({ maxSize: 1_000 });

interface NoteContextType {
  ev: TaggedNostrEvent;
  link: NostrLink;
  related: ReadonlyArray<TaggedNostrEvent>;
  reactions: ReturnType<typeof useEventReactions>;
  showReactionsModal: boolean;
  setShowReactionsModal: (show: boolean) => void;

  translated: NoteTranslation | undefined;
  setTranslated: (translation: NoteTranslation) => void;
  showTranslation: boolean;
  toggleTranslation: () => void;
  translate: () => Promise<void>;
}

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export interface NoteProviderProps {
  ev: TaggedNostrEvent;
  children: ReactNode;
}

export function NoteProvider({ ev, children }: NoteProviderProps) {
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [translated, setTranslatedState] = useState<NoteTranslation | undefined>(
    translationCache.get(ev.id) ?? undefined,
  );
  const { isMuted } = useModeration();

  const link = useMemo(() => NostrLink.fromEvent(ev), [ev.id]);
  const relatedRaw = useReactions(`reactions:${link.tagKey}`, link);
  const related = useMemo(() => relatedRaw.filter(a => !isMuted(a.pubkey)), [relatedRaw, isMuted]);
  const reactions = useEventReactions(link, related);
  const autoTranslate = usePreferences(s => s.autoTranslate);

  const toggleTranslation = useCallback(() => {
    setShowTranslation(prev => !prev);
  }, []);

  const translate = useCallback(async () => {
    if (translated) return;

    const lang = window.navigator.language;
    const langNames = new Intl.DisplayNames([...window.navigator.languages], {
      type: "language",
    });

    const api = new SnortApi();
    const targetLang = lang.split("-")[0].toUpperCase();
    const result = await api.translate({
      text: [ev.content],
      target_lang: targetLang,
    });

    if (
      "translations" in result &&
      result.translations.length > 0 &&
      targetLang != result.translations[0].detected_source_language
    ) {
      setTranslatedState({
        text: result.translations[0].text,
        fromLanguage: langNames.of(result.translations[0].detected_source_language),
        confidence: 1,
      } as NoteTranslation);
    } else {
      setTranslatedState({
        text: "",
        fromLanguage: "",
        confidence: 0,
        skipped: true,
      });
    }
  }, [translated, setTranslatedState]);

  useEffect(() => {
    if (!translated && autoTranslate) {
      translate().catch(console.warn);
    }
  }, [translated, translate, autoTranslate]);

  const value = useMemo(
    () => ({
      ev,
      link,
      related,
      reactions,
      showReactionsModal,
      setShowReactionsModal,
      translated,
      setTranslated: setTranslatedState,
      showTranslation,
      toggleTranslation,
      translate,
    }),
    [
      ev,
      link,
      related,
      reactions,
      showReactionsModal,
      translated,
      setTranslatedState,
      showTranslation,
      toggleTranslation,
      translate,
    ],
  );

  return (
    <NoteContext.Provider value={value}>
      {children}
      {showReactionsModal && <ReactionsModal onClose={() => setShowReactionsModal(false)} />}
    </NoteContext.Provider>
  );
}

export function useNoteContext() {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error("useNoteContext must be used within a NoteProvider");
  }
  return context;
}
