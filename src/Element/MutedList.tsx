import { useMemo } from "react";
import { useSelector } from "react-redux";

import { HexKey } from "Nostr";
import type { RootState } from "State/Store";
import MuteButton from "Element/MuteButton";
import ProfilePreview from "Element/ProfilePreview";
import useMutedFeed, { getMuted } from "Feed/MuteList";
import useModeration from "Hooks/useModeration";

export interface MutedListProps {
  pubkey: HexKey;
}

export default function MutedList({ pubkey }: MutedListProps) {
  const { muted, isMuted, mute, unmute, muteAll } = useModeration();
  const feed = useMutedFeed(pubkey);
  const pubkeys = useMemo(() => {
    return getMuted(feed.store, pubkey);
  }, [feed, pubkey]);
  const hasAllMuted = pubkeys.every(isMuted);

  return (
    <div className="main-content">
      <div className="flex mt10">
        <div className="f-grow bold">{`${pubkeys?.length} muted`}</div>
        <button
          disabled={hasAllMuted || pubkeys.length === 0}
          className="transparent"
          type="button"
          onClick={() => muteAll(pubkeys)}
        >
          Mute all
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
