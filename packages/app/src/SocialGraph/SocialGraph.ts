import { ID, STR, UID } from "./UniqueIds";
import { LoginStore } from "../Login";
import { unwrap } from "../SnortUtils";
import { HexKey, MetadataCache, NostrEvent } from "@snort/system";

type Unsubscribe = () => void;

const Key = {
  pubKey: null as HexKey | null,
  getPubKey: () => {
    return unwrap(LoginStore.snapshot().publicKey);
  },
  isMine: (user: HexKey) => user === Key.getPubKey(),
};

export default {
  followDistanceByUser: new Map<UID, number>(),
  usersByFollowDistance: new Map<number, Set<UID>>(),
  profiles: new Map<UID, MetadataCache>(), // JSON.parsed event.content of profile events
  followedByUser: new Map<UID, Set<UID>>(),
  followersByUser: new Map<UID, Set<UID>>(),
  latestFollowEventTimestamps: new Map<UID, number>(),

  handleFollowEvent: function (event: NostrEvent) {
    try {
      const author = ID(event.pubkey);
      const timestamp = event.created_at;
      const existingTimestamp = this.latestFollowEventTimestamps.get(author);
      if (existingTimestamp && timestamp <= existingTimestamp) {
        return;
      }
      this.latestFollowEventTimestamps.set(author, timestamp);

      // Collect all users followed in the new event.
      const followedInEvent = new Set<UID>();
      for (const tag of event.tags) {
        if (tag[0] === "p") {
          const followedUser = ID(tag[1]);
          if (followedUser !== author) {
            followedInEvent.add(followedUser);
          }
        }
      }

      // Get the set of users currently followed by the author.
      const currentlyFollowed = this.followedByUser.get(author) || new Set<UID>();

      // Find users that need to be removed.
      for (const user of currentlyFollowed) {
        if (!followedInEvent.has(user)) {
          this.removeFollower(user, author);
        }
      }

      // Add or update the followers based on the new event.
      for (const user of followedInEvent) {
        this.addFollower(user, author);
      }
    } catch (e) {
      // might not be logged in or sth
    }
  },

  isFollowing: function (follower: HexKey, followedUser: HexKey): boolean {
    const followedUserId = ID(followedUser);
    const followerId = ID(follower);
    return !!this.followedByUser.get(followerId)?.has(followedUserId);
  },

  getFollowDistance: function (user: HexKey): number {
    try {
      if (Key.isMine(user)) {
        return 0;
      }
      const userId = ID(user);
      const distance = this.followDistanceByUser.get(userId);
      return distance === undefined ? 1000 : distance;
    } catch (e) {
      // might not be logged in or sth
      return 1000;
    }
  },

  addUserByFollowDistance(distance: number, user: UID) {
    if (!this.usersByFollowDistance.has(distance)) {
      this.usersByFollowDistance.set(distance, new Set());
    }
    if (distance <= 2) {
      /*
      let unsub;
      // get also profile events for profile search indexing
      // eslint-disable-next-line prefer-const
      unsub = PubSub.subscribe({ authors: [STR(user)], kinds: [0] }, () => unsub?.(), true);
      // TODO subscribe once param?
       */
    }
    this.usersByFollowDistance.get(distance)?.add(user);
    // remove from higher distances
    for (const d of this.usersByFollowDistance.keys()) {
      if (d > distance) {
        this.usersByFollowDistance.get(d)?.delete(user);
      }
    }
  },

  ensureRootUser: function () {
    const myId = ID(Key.getPubKey());
    if (myId && !this.followDistanceByUser.has(myId)) {
      this.followDistanceByUser.set(myId, 0);
      this.addUserByFollowDistance(0, myId);
    }
  },

  addFollower: function (followedUser: UID, follower: UID) {
    if (typeof followedUser !== "number" || typeof follower !== "number") {
      throw new Error("Invalid user id");
    }
    this.ensureRootUser();
    if (!this.followersByUser.has(followedUser)) {
      this.followersByUser.set(followedUser, new Set<UID>());
    }
    this.followersByUser.get(followedUser)?.add(follower);

    if (!this.followedByUser.has(follower)) {
      this.followedByUser.set(follower, new Set<UID>());
    }
    const myId = ID(Key.getPubKey());

    if (followedUser !== myId) {
      let newFollowDistance;
      if (follower === myId) {
        // basically same as the next "else" block, but faster
        newFollowDistance = 1;
        this.addUserByFollowDistance(newFollowDistance, followedUser);
        this.followDistanceByUser.set(followedUser, newFollowDistance);
      } else {
        const existingFollowDistance = this.followDistanceByUser.get(followedUser);
        const followerDistance = this.followDistanceByUser.get(follower);
        newFollowDistance = followerDistance && followerDistance + 1;
        if (existingFollowDistance === undefined || (newFollowDistance && newFollowDistance < existingFollowDistance)) {
          this.followDistanceByUser.set(followedUser, newFollowDistance!);
          this.addUserByFollowDistance(newFollowDistance!, followedUser);
        }
      }
    }

    this.followedByUser.get(follower)?.add(followedUser);
    if (this.followedByUser.get(myId)?.has(follower)) {
      /*
      setTimeout(() => {
          PubSub.subscribe({ authors: [STR(followedUser)], kinds: [0, 3] }, undefined, true);
        }, 0);
       */
    }
  },
  removeFollower: function (unfollowedUser: UID, follower: UID) {
    this.followersByUser.get(unfollowedUser)?.delete(follower);
    this.followedByUser.get(follower)?.delete(unfollowedUser);

    if (unfollowedUser === ID(Key.getPubKey())) {
      return;
    }

    // iterate over remaining followers and set the smallest follow distance
    let smallest = Infinity;
    for (const follower of this.followersByUser.get(unfollowedUser) || []) {
      const followerDistance = this.followDistanceByUser.get(follower);
      if (followerDistance !== undefined && followerDistance + 1 < smallest) {
        smallest = followerDistance + 1;
      }
    }

    if (smallest === Infinity) {
      this.followDistanceByUser.delete(unfollowedUser);
    } else {
      this.followDistanceByUser.set(unfollowedUser, smallest);
    }
  },
  // TODO subscription methods for followersByUser and followedByUser. and maybe messagesByTime. and replies
  followerCount: function (address: HexKey) {
    const id = ID(address);
    return this.followersByUser.get(id)?.size ?? 0;
  },
  followedByFriendsCount: function (address: HexKey) {
    let count = 0;
    const myId = ID(Key.getPubKey());
    const id = ID(address);
    for (const follower of this.followersByUser.get(id) ?? []) {
      if (this.followedByUser.get(myId)?.has(follower)) {
        count++; // should we stop at 10?
      }
    }
    return count;
  },
  getFollowedByUser: function (
    user: HexKey,
    cb?: (followedUsers: Set<HexKey>) => void,
    includeSelf = false,
  ): Unsubscribe {
    const userId = ID(user);
    const callback = () => {
      if (cb) {
        const set = new Set<HexKey>();
        for (const id of this.followedByUser.get(userId) || []) {
          set.add(STR(id));
        }
        if (includeSelf) {
          set.add(user);
        }
        cb(set);
      }
    };
    if (this.followedByUser.has(userId) || includeSelf) {
      callback();
    }
    //return PubSub.subscribe({ kinds: [3], authors: [user] }, callback);
    return () => {};
  },
  getFollowersByUser: function (address: HexKey, cb?: (followers: Set<HexKey>) => void): Unsubscribe {
    const userId = ID(address);
    const callback = () => {
      if (cb) {
        const set = new Set<HexKey>();
        for (const id of this.followersByUser.get(userId) || []) {
          set.add(STR(id));
        }
        cb(set);
      }
    };
    this.followersByUser.has(userId) && callback();
    //return PubSub.subscribe({ kinds: [3], '#p': [address] }, callback); // TODO this doesn't fire when a user is unfollowed
    return () => {};
  },
};
