import { FormattedMessage } from "react-intl";
import { HexKey } from "Nostr";
import useModeration from "Hooks/useModeration";

import messages from "./messages";

interface BlockButtonProps {
  pubkey: HexKey;
}

const BlockButton = ({ pubkey }: BlockButtonProps) => {
  const { block, unblock, isBlocked } = useModeration();
  return isBlocked(pubkey) ? (
    <button className="secondary" type="button" onClick={() => unblock(pubkey)}>
      <FormattedMessage {...messages.Unblock} />
    </button>
  ) : (
    <button className="secondary" type="button" onClick={() => block(pubkey)}>
      <FormattedMessage {...messages.Block} />
    </button>
  );
};

export default BlockButton;
