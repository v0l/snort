import { FormattedMessage } from "react-intl";

import MuteButton from "@/Components/User/MuteButton";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useModeration from "@/Hooks/useModeration";

import messages from "../messages";

export interface MutedListProps {
  pubkeys: Array<string>;
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
        const tag = a.toEventTag();
        switch (tag?.at(0)) {
          case "p": {
            return (
              <ProfilePreview
                actions={<MuteButton pubkey={tag[1]} />}
                pubkey={tag[1]}
                options={{ about: false }}
                key={tag[1]}
              />
            );
          }
        }
        return undefined;
      })}
    </div>
  );
}
