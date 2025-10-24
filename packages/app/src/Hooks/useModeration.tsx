import { dedupe } from "@snort/shared";
import { EventKind, NostrEvent, NostrLink, TaggedNostrEvent, ToNostrEventTag, UnknownTag } from "@snort/system";

import useLogin from "@/Hooks/useLogin";

import useWoT from "./useWoT";

export class MutedWordTag implements ToNostrEventTag {
  constructor(readonly word: string) {}
  equals(other: ToNostrEventTag): boolean {
    return other instanceof MutedWordTag && other.word === this.word;
  }

  toEventTag(): string[] | undefined {
    return ["word", this.word.toLowerCase()];
  }
}

export default function useModeration() {
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));
  const wot = useWoT();

  function isMuted(pubkey: string) {
    const link = NostrLink.publicKey(pubkey);
    const distance = wot.followDistance(pubkey);
    return state.muted.some(a => a.equals(link)) || (state.appdata?.preferences.muteWithWoT && distance > 2);
  }

  async function unmute(id: string) {
    const link = NostrLink.publicKey(id);
    state.unmute(link);
    await state.saveList(EventKind.MuteList);
  }

  async function mute(id: string) {
    const link = NostrLink.publicKey(id);
    state.mute(link);
    await state.saveList(EventKind.MuteList);
  }

  async function muteAll(ids: string[]) {
    const links = dedupe(ids).map(a => NostrLink.publicKey(a));
    for (const link of links) {
      state.mute(link);
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
      state.addToList(EventKind.MuteList, new MutedWordTag(w.toLowerCase()));
    }
    await state.saveList(EventKind.MuteList);
  }

  async function removeMutedWord(word: string) {
    state.removeFromList(EventKind.MuteList, new MutedWordTag(word.toLowerCase()));
    await state.saveList(EventKind.MuteList);
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
