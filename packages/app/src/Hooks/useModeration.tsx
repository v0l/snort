import { HexKey } from "System";
import useEventPublisher from "Feed/EventPublisher";
import useLogin from "Hooks/useLogin";
import { setBlocked, setMuted } from "Login";
import { appendDedupe } from "SnortUtils";

export default function useModeration() {
  const login = useLogin();
  const { muted, blocked } = login;
  const publisher = useEventPublisher();

  async function setMutedList(pub: HexKey[], priv: HexKey[]) {
    if (publisher) {
      const ev = await publisher.muted(pub, priv);
      publisher.broadcast(ev);
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
  };
}
