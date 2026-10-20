import { NostrLink, type TaggedNostrEvent } from "@snort/system"
import { useEventReactions, useReactions } from "@snort/system-react"
import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import SnortApi from "@/External/SnortApi"
import useModeration from "@/Hooks/useModeration"
import usePreferences from "@/Hooks/usePreferences"
import ReactionsModal from "./ReactionsModal"
import { type TranslationEntry, translationCache } from "./translationCache"
import type { NoteTranslation } from "./types"

function targetLanguage() {
  return window.navigator.language.split("-")[0].toUpperCase()
}

function toNoteTranslation(entry: TranslationEntry | undefined): NoteTranslation | undefined {
  if (!entry) return undefined
  if (entry.skipped) return { text: "", fromLanguage: "", confidence: 0, skipped: true }
  const langNames = new Intl.DisplayNames([...window.navigator.languages], { type: "language" })
  return { text: entry.text, fromLanguage: langNames.of(entry.source) ?? entry.source, confidence: 1 }
}

interface NoteContextType {
  ev: TaggedNostrEvent
  link: NostrLink
  related: ReadonlyArray<TaggedNostrEvent>
  reactions: ReturnType<typeof useEventReactions>
  showReactionsModal: boolean
  setShowReactionsModal: (show: boolean) => void

  translated: NoteTranslation | undefined
  setTranslated: (translation: NoteTranslation) => void
  showTranslation: boolean
  toggleTranslation: () => void
  translate: () => Promise<void>
}

const NoteContext = createContext<NoteContextType | undefined>(undefined)

export interface NoteProviderProps {
  ev: TaggedNostrEvent
  children: ReactNode
}

export function NoteProvider({ ev, children }: NoteProviderProps) {
  const [showReactionsModal, setShowReactionsModal] = useState(false)
  const [showTranslation, setShowTranslation] = useState(true)
  const [translated, setTranslatedState] = useState<NoteTranslation | undefined>(
    toNoteTranslation(translationCache.get(ev.id, targetLanguage())),
  )
  const { isMuted } = useModeration()

  // biome-ignore lint/correctness/useExhaustiveDependencies: ev.id is the stable identity key for a Nostr event
  const link = useMemo(() => NostrLink.fromEvent(ev), [ev.id])
  const relatedRaw = useReactions(`reactions:${link.tagKey}`, link)
  const related = useMemo(() => relatedRaw.filter(a => !isMuted(a.pubkey)), [relatedRaw, isMuted])
  const reactions = useEventReactions(link, related)
  const autoTranslate = usePreferences(s => s.autoTranslate)

  const toggleTranslation = useCallback(() => {
    setShowTranslation(prev => !prev)
  }, [])

  const evContentRef = useRef(ev.content)
  evContentRef.current = ev.content

  const translate = useCallback(async () => {
    const targetLang = targetLanguage()
    const entry = await translationCache.resolve(ev.id, targetLang, async () => {
      const result = await new SnortApi().translate({
        text: [evContentRef.current],
        target_lang: targetLang,
      })
      if (
        "translations" in result &&
        result.translations.length > 0 &&
        targetLang !== result.translations[0].detected_source_language
      ) {
        return { text: result.translations[0].text, source: result.translations[0].detected_source_language }
      }
      return { skipped: true }
    })
    setTranslatedState(toNoteTranslation(entry))
  }, [ev.id])

  useEffect(() => {
    if (translated || !autoTranslate) return
    let cancelled = false
    translate().catch(e => {
      if (!cancelled) console.warn(e)
    })
    return () => {
      cancelled = true
    }
  }, [translated, translate, autoTranslate])

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
    [ev, link, related, reactions, showReactionsModal, translated, showTranslation, toggleTranslation, translate],
  )

  return (
    <NoteContext.Provider value={value}>
      {children}
      {showReactionsModal && <ReactionsModal onClose={() => setShowReactionsModal(false)} />}
    </NoteContext.Provider>
  )
}

export function useNoteContext() {
  const context = use(NoteContext)
  if (!context) {
    throw new Error("useNoteContext must be used within a NoteProvider")
  }
  return context
}
