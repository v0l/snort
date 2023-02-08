import { useMemo } from "react";
import { FormattedMessage } from "react-intl";

import { HexKey } from "Nostr";
import MuteButton from "Element/MuteButton";
import ProfilePreview from "Element/ProfilePreview";
import useMutedFeed, { getMuted } from "Feed/MuteList";
import useModeration from "Hooks/useModeration";

import messages from "./messages";

export interface MutedListProps {
  pubkey: HexKey;
}

export default function MutedList({ pubkey }: MutedListProps) {
  const { isMuted, muteAll } = useModeration();
  const feed = useMutedFeed(pubkey);
  const pubkeys = useMemo(() => {
    return getMuted(feed.store, pubkey);
  }, [feed, pubkey]);
  const hasAllMuted = pubkeys.every(isMuted);

  return (
    <div className="main-content">
      <div className="flex mt10">
        <div className="f-grow bold">
          <FormattedMessage
            {...messages.MuteCount}
            values={{ n: pubkeys?.length }}
          />
        </div>
        <button
          disabled={hasAllMuted || pubkeys.length === 0}
          className="transparent"
          type="button"
          onClick={() => muteAll(pubkeys)}
        >
          <FormattedMessage {...messages.MuteAll} />
        </button>
      </div>
      {pubkeys?.map((a) => {
        return (
          <ProfilePreview
            actions={<MuteButton pubkey={a} />}
            pubkey={a}
            options={{ about: false }}
            key={a}
          />
        );
      })}
    </div>
  );
}
