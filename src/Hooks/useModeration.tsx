import { useSelector, useDispatch } from "react-redux";

import type { RootState } from "State/Store";
import { HexKey } from "Nostr";
import useEventPublisher from "Feed/EventPublisher";
import { setMuted } from "State/Login";


export default function useModeration() {
  const dispatch = useDispatch()
  const { muted } = useSelector((s: RootState) => s.login)
  const publisher = useEventPublisher()

  async function setMutedList(ids: HexKey[]) {
      try {
        const ev = await publisher.muted(ids)
        console.debug(ev);
        publisher.broadcast(ev)
      } catch (error) {
        console.debug("Couldn't change mute list")
      }
    }

  function isMuted(id: HexKey) {
    return muted.includes(id)
  }

  function unmute(id: HexKey) {
    const newMuted = muted.filter(p => p !== id)
    dispatch(setMuted({
      createdAt: new Date().getTime(),
      keys: newMuted
    }))
    setMutedList(newMuted)
  }

  function mute(id: HexKey) {
    const newMuted = muted.concat([id])
    setMutedList(newMuted)
    dispatch(setMuted({
      createdAt: new Date().getTime(),
      keys: newMuted
    }))
  }

  function muteAll(ids: HexKey[]) {
    const newMuted = Array.from(new Set(muted.concat(ids)))
    setMutedList(newMuted)
    dispatch(setMuted({
      createdAt: new Date().getTime(),
      keys: newMuted
    }))
  }

  return { muted, mute, muteAll, unmute, isMuted }
}
