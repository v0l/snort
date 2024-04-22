import { HexKey, NostrPrefix } from "@snort/system";
import { FormattedMessage } from "react-intl";

import MuteButton from "@/Components/User/MuteButton";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useModeration from "@/Hooks/useModeration";

import messages from "../messages";

export interface MutedListProps {
  pubkeys: HexKey[];
}

export default function MutedList() {
  const { muteList } = useModeration();

  return (
    <div className="p">
      <div className="flex justify-between">
        <div className="bold">
          <FormattedMessage {...messages.MuteCount} values={{ n: muteList?.length }} />
        </div>
      </div>
      {muteList?.map(a => {
        switch (a.type) {
          case NostrPrefix.Profile:
          case NostrPrefix.PublicKey: {
            return (
              <ProfilePreview
                actions={<MuteButton pubkey={a.id} />}
                pubkey={a.id}
                options={{ about: false }}
                key={a.id}
              />
            );
          }
        }
        return undefined;
      })}
    </div>
  );
}
