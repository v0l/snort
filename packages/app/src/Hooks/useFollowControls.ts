import { dedupe } from "@snort/shared";
import { useMemo } from "react";

import useEventPublisher from "./useEventPublisher";
import useLogin from "./useLogin";

/**
 * Simple hook for adding / removing follows
 */
export default function useFollowsControls() {
  const { publisher, system } = useEventPublisher();
  const { follows, relays } = useLogin(s => ({ follows: s.follows.item, readonly: s.readonly, relays: s.relays.item }));

  return useMemo(() => {
    const publishList = async (newList: Array<string>) => {
      if (publisher) {
        const ev = await publisher.contactList(
          newList.map(a => ["p", a]),
          relays,
        );
        system.BroadcastEvent(ev);
      }
    };

    return {
      isFollowing: (pk: string) => {
        return follows.includes(pk);
      },
      addFollow: async (pk: Array<string>) => {
        const newList = dedupe([...follows, ...pk]);
        await publishList(newList);
      },
      removeFollow: async (pk: Array<string>) => {
        const newList = follows.filter(a => !pk.includes(a));
        await publishList(newList);
      },
      setFollows: async (pk: Array<string>) => {
        await publishList(dedupe(pk));
      },
    };
  }, [follows, relays, publisher, system]);
}
