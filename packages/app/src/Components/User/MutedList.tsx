import { HexKey } from "@snort/system";
import { FormattedMessage } from "react-intl";

import MuteButton from "@/Components/User/MuteButton";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useModeration from "@/Hooks/useModeration";

import messages from "../messages";

export interface MutedListProps {
  pubkeys: HexKey[];
}

export default function MutedList({ pubkeys }: MutedListProps) {
  const { isMuted, muteAll } = useModeration();
  const hasAllMuted = pubkeys.every(isMuted);

  return (
    <div className="p">
      <div className="flex justify-between">
        <div className="bold">
          <FormattedMessage {...messages.MuteCount} values={{ n: pubkeys?.length }} />
        </div>
        <button
          disabled={hasAllMuted || pubkeys.length === 0}
          className="transparent"
          type="button"
          onClick={() => muteAll(pubkeys)}>
          <FormattedMessage {...messages.MuteAll} />
        </button>
      </div>
      {pubkeys?.map(a => {
        return <ProfilePreview actions={<MuteButton pubkey={a} />} pubkey={a} options={{ about: false }} key={a} />;
      })}
    </div>
  );
}
