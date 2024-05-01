import { dedupe } from "@snort/shared";
import { EventKind, NostrEvent, NostrLink, TaggedNostrEvent, ToNostrEventTag, UnknownTag } from "@snort/system";

import useLogin from "@/Hooks/useLogin";

export class MutedWordTag implements ToNostrEventTag {
  constructor(readonly word: string) {}

  toEventTag(): string[] | undefined {
    return ["word", this.word.toLowerCase()];
  }
}

export default function useModeration() {
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));

  function isMuted(id: string) {
    const link = NostrLink.publicKey(id);
    return state.muted.includes(link);
  }

  async function unmute(id: string) {
    const link = NostrLink.publicKey(id);
    await state.unmute(link, true);
  }

  async function mute(id: string) {
    const link = NostrLink.publicKey(id);
    await state.mute(link, true);
  }

  async function muteAll(ids: string[]) {
    const links = dedupe(ids).map(a => NostrLink.publicKey(a));
    for (const link of links) {
      await state.mute(link, false);
    }
    await state.saveList(EventKind.MuteList);
  }

  function isMutedWord(word: string) {
    const words = getMutedWords();
    return words.includes(word);
  }

  async function addMutedWord(word: string | Array<string>) {
    const words = Array.isArray(word) ? word : [word];
    for (const w of words) {
      await state.addToList(EventKind.MuteList, new MutedWordTag(w.toLowerCase()), false);
    }
    await state.saveList(EventKind.MuteList);
  }

  async function removeMutedWord(word: string) {
    await state.removeFromList(EventKind.MuteList, new MutedWordTag(word.toLowerCase()), true);
  }

  function isEventMuted(ev: TaggedNostrEvent | NostrEvent) {
    return isMuted(ev.pubkey) || false;
  }

  function getMutedWords() {
    return state
      .getList(EventKind.MuteList)
      .filter(a => a instanceof UnknownTag && a.value[0] === "word")
      .map(a => (a as UnknownTag).value[1]);
  }

  return {
    muteList: state.muted,
    mute,
    muteAll,
    unmute,
    isMuted,
    isMutedWord,
    isEventMuted,
    addMutedWord,
    removeMutedWord,
    getMutedWords,
  };
}
