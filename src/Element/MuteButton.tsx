import { FormattedMessage } from "react-intl";
import { HexKey } from "Nostr";
import useModeration from "Hooks/useModeration";

import messages from "./messages";

interface MuteButtonProps {
  pubkey: HexKey;
}

const MuteButton = ({ pubkey }: MuteButtonProps) => {
  const { mute, unmute, isMuted } = useModeration();
  return isMuted(pubkey) ? (
    <button className="secondary" type="button" onClick={() => unmute(pubkey)}>
      <FormattedMessage {...messages.Unmute} />
    </button>
  ) : (
    <button type="button" onClick={() => mute(pubkey)}>
      <FormattedMessage {...messages.Mute} />
    </button>
  );
};

export default MuteButton;
