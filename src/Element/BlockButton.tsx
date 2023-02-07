import { HexKey } from "Nostr";
import useModeration from "Hooks/useModeration";

interface BlockButtonProps {
  pubkey: HexKey;
}

const BlockButton = ({ pubkey }: BlockButtonProps) => {
  const { block, unblock, isBlocked } = useModeration();
  return isBlocked(pubkey) ? (
    <button className="secondary" type="button" onClick={() => unblock(pubkey)}>
      Unblock
    </button>
  ) : (
    <button className="secondary" type="button" onClick={() => block(pubkey)}>
      Block
    </button>
  );
};

export default BlockButton;
