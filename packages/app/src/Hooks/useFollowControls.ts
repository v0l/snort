import { NostrLink } from "@snort/system";

import useLogin from "./useLogin";

/**
 * Simple hook for adding / removing follows
 */
export default function useFollowsControls() {
  const state = useLogin(s => s.state);

  return {
    isFollowing: (pk: string) => {
      return state.follows?.includes(pk);
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
    followList: state.follows ?? [],
  };
}
