import { NostrLink } from "@snort/system";
import { useMemo } from "react";

import useLogin from "./useLogin";

/**
 * Simple hook for adding / removing follows
 */
export default function useFollowsControls() {
  const { state, v } = useLogin(s => ({ v: s.state.version, state: s.state }));

  return useMemo(() => {
    const follows = state.follows;
    return {
      isFollowing: (pk: string) => {
        return follows?.includes(pk);
      },
      addFollow: async (pk: Array<string>) => {
        for (const p of pk) {
          await state.follow(NostrLink.publicKey(p), false);
        }
        await state.saveContacts();
      },
      removeFollow: async (pk: Array<string>) => {
        for (const p of pk) {
          await state.unfollow(NostrLink.publicKey(p), false);
        }
        await state.saveContacts();
      },
      setFollows: async (pk: Array<string>) => {
        await state.replaceFollows(pk.map(a => NostrLink.publicKey(a)));
      },
      followList: follows ?? [],
    };
  }, [v]);
}
