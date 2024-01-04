import { HexKey, NostrEvent, TaggedNostrEvent } from "@snort/system";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { setBlocked, setMuted } from "@/Utils/Login";
import { appendDedupe } from "@/Utils";

export default function useModeration() {
  const login = useLogin();
  const { muted, blocked, appData } = login;
  const { publisher, system } = useEventPublisher();

  async function setMutedList(pub: HexKey[], priv: HexKey[]) {
    if (publisher) {
      const ev = await publisher.muted(pub, priv);
      system.BroadcastEvent(ev);
      return ev.created_at * 1000;
    }
    return 0;
  }

  function isMuted(id: HexKey) {
    return muted.item.includes(id) || blocked.item.includes(id);
  }

  function isBlocked(id: HexKey) {
    return blocked.item.includes(id);
  }

  async function unmute(id: HexKey) {
    const newMuted = muted.item.filter(p => p !== id);
    const ts = await setMutedList(newMuted, blocked.item);
    setMuted(login, newMuted, ts);
  }

  async function unblock(id: HexKey) {
    const newBlocked = blocked.item.filter(p => p !== id);
    const ts = await setMutedList(muted.item, newBlocked);
    setBlocked(login, newBlocked, ts);
  }

  async function mute(id: HexKey) {
    const newMuted = muted.item.includes(id) ? muted.item : muted.item.concat([id]);
    const ts = await setMutedList(newMuted, blocked.item);
    setMuted(login, newMuted, ts);
  }

  async function block(id: HexKey) {
    const newBlocked = blocked.item.includes(id) ? blocked.item : blocked.item.concat([id]);
    const ts = await setMutedList(muted.item, newBlocked);
    setBlocked(login, newBlocked, ts);
  }

  async function muteAll(ids: HexKey[]) {
    const newMuted = appendDedupe(muted.item, ids);
    const ts = await setMutedList(newMuted, blocked.item);
    setMuted(login, newMuted, ts);
  }

  function isMutedWord(word: string) {
    return appData.item.mutedWords.includes(word.toLowerCase());
  }

  function isEventMuted(ev: TaggedNostrEvent | NostrEvent) {
    return isMuted(ev.pubkey) || appData.item.mutedWords.some(w => ev.content.toLowerCase().includes(w));
  }

  return {
    muted: muted.item,
    mute,
    muteAll,
    unmute,
    isMuted,
    blocked: blocked.item,
    block,
    unblock,
    isBlocked,
    isMutedWord,
    isEventMuted,
  };
}
