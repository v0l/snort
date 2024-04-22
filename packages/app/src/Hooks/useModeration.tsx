import { EventKind, NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";

import useLogin from "@/Hooks/useLogin";
import { dedupe } from "@snort/shared";

export default function useModeration() {
  const state = useLogin(s => s.state);

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
    return false;
  }

  function isEventMuted(ev: TaggedNostrEvent | NostrEvent) {
    return isMuted(ev.pubkey) || false;
  }

  return {
    muteList: state.muted,
    mute,
    muteAll,
    unmute,
    isMuted,
    isMutedWord,
    isEventMuted,
  };
}
