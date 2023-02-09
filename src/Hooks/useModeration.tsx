import { useSelector, useDispatch } from "react-redux";

import type { RootState } from "State/Store";
import { HexKey } from "Nostr";
import useEventPublisher from "Feed/EventPublisher";
import { setMuted, setBlocked } from "State/Login";

export default function useModeration() {
  const dispatch = useDispatch();
  const { blocked, muted } = useSelector((s: RootState) => s.login);
  const publisher = useEventPublisher();

  async function setMutedList(pub: HexKey[], priv: HexKey[]) {
    try {
      const ev = await publisher.muted(pub, priv);
      console.debug(ev);
      publisher.broadcast(ev);
    } catch (error) {
      console.debug("Couldn't change mute list");
    }
  }

  function isMuted(id: HexKey) {
    return muted.includes(id) || blocked.includes(id);
  }

  function isBlocked(id: HexKey) {
    return blocked.includes(id);
  }

  function unmute(id: HexKey) {
    const newMuted = muted.filter(p => p !== id);
    dispatch(
      setMuted({
        createdAt: new Date().getTime(),
        keys: newMuted,
      })
    );
    setMutedList(newMuted, blocked);
  }

  function unblock(id: HexKey) {
    const newBlocked = blocked.filter(p => p !== id);
    dispatch(
      setBlocked({
        createdAt: new Date().getTime(),
        keys: newBlocked,
      })
    );
    setMutedList(muted, newBlocked);
  }

  function mute(id: HexKey) {
    const newMuted = muted.includes(id) ? muted : muted.concat([id]);
    setMutedList(newMuted, blocked);
    dispatch(
      setMuted({
        createdAt: new Date().getTime(),
        keys: newMuted,
      })
    );
  }

  function block(id: HexKey) {
    const newBlocked = blocked.includes(id) ? blocked : blocked.concat([id]);
    setMutedList(muted, newBlocked);
    dispatch(
      setBlocked({
        createdAt: new Date().getTime(),
        keys: newBlocked,
      })
    );
  }

  function muteAll(ids: HexKey[]) {
    const newMuted = Array.from(new Set(muted.concat(ids)));
    setMutedList(newMuted, blocked);
    dispatch(
      setMuted({
        createdAt: new Date().getTime(),
        keys: newMuted,
      })
    );
  }

  return {
    muted,
    mute,
    muteAll,
    unmute,
    isMuted,
    blocked,
    block,
    unblock,
    isBlocked,
  };
}
