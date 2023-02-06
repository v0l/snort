import { HexKey } from "Nostr";
import useModeration from "Hooks/useModeration";

interface MuteButtonProps {
  pubkey: HexKey
}

const MuteButton = ({ pubkey }: MuteButtonProps) => {
  const { mute, unmute, isMuted } = useModeration()
  return isMuted(pubkey) ? (
    <button className="secondary" type="button" onClick={() => unmute(pubkey)}>
       Unmute
    </button>
  ) : (
    <button type="button" onClick={() => mute(pubkey)}>
       Mute
    </button>
  )
}

export default MuteButton
