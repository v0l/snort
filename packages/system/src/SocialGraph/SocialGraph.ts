import { ID, STR, UID } from "./UniqueIds";
import { HexKey, NostrEvent } from "..";
import EventEmitter from "eventemitter3";
import { unixNowMs } from "@snort/shared";
import debug from "debug";

export interface SocialGraphEvents {
  changeRoot: () => void;
}

export default class SocialGraph extends EventEmitter<SocialGraphEvents> {
  #log = debug("SocialGraph");
  root: UID;
  followDistanceByUser = new Map<UID, number>();
  usersByFollowDistance = new Map<number, Set<UID>>();
  followedByUser = new Map<UID, Set<UID>>();
  followersByUser = new Map<UID, Set<UID>>();
  latestFollowEventTimestamps = new Map<UID, number>();

  constructor(root: HexKey) {
    super();
    this.root = ID(root);
    this.followDistanceByUser.set(this.root, 0);
    this.usersByFollowDistance.set(0, new Set([this.root]));
  }

  setRoot(root: HexKey) {
    const rootId = ID(root);
    if (rootId === this.root) {
      return;
    }
    const start = unixNowMs();
    this.root = rootId;
    this.followDistanceByUser.clear();
    this.usersByFollowDistance.clear();
    this.followDistanceByUser.set(this.root, 0);
    this.usersByFollowDistance.set(0, new Set([this.root]));

    const queue = [this.root];

    while (queue.length > 0) {
      const user = queue.shift()!;
      const distance = this.followDistanceByUser.get(user)!;

      const followers = this.followersByUser.get(user) || new Set<UID>();
      for (const follower of followers) {
        if (!this.followDistanceByUser.has(follower)) {
          const newFollowDistance = distance + 1;
          this.followDistanceByUser.set(follower, newFollowDistance);
          if (!this.usersByFollowDistance.has(newFollowDistance)) {
            this.usersByFollowDistance.set(newFollowDistance, new Set());
          }
          this.usersByFollowDistance.get(newFollowDistance)!.add(follower);
          queue.push(follower);
        }
      }
    }
    this.emit("changeRoot");
    this.#log(`Rebuilding root took ${(unixNowMs() - start).toFixed(2)} ms`);
  }

  handleEvent(evs: NostrEvent | Array<NostrEvent>) {
    const filtered = (Array.isArray(evs) ? evs : [evs]).filter(a => a.kind === 3);
    if (filtered.length === 0) {
      return;
    }
    queueMicrotask(() => {
      try {
        for (const event of filtered) {
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
        }
      } catch (e) {
        // might not be logged in or sth
      }
    });
  }

  isFollowing(follower: HexKey, followedUser: HexKey): boolean {
    const followedUserId = ID(followedUser);
    const followerId = ID(follower);
    return !!this.followedByUser.get(followerId)?.has(followedUserId);
  }

  getFollowDistance(user: HexKey): number {
    try {
      const userId = ID(user);
      if (userId === this.root) {
        return 0;
      }
      const distance = this.followDistanceByUser.get(userId);
      return distance === undefined ? 1000 : distance;
    } catch (e) {
      // might not be logged in or sth
      return 1000;
    }
  }

  addUserByFollowDistance(distance: number, user: UID) {
    if (!this.usersByFollowDistance.has(distance)) {
      this.usersByFollowDistance.set(distance, new Set());
    }
    this.usersByFollowDistance.get(distance)?.add(user);
    // remove from higher distances
    for (const d of this.usersByFollowDistance.keys()) {
      if (d > distance) {
        this.usersByFollowDistance.get(d)?.delete(user);
      }
    }
  }

  addFollower(followedUser: UID, follower: UID) {
    if (typeof followedUser !== "number" || typeof follower !== "number") {
      throw new Error("Invalid user id");
    }
    if (!this.followersByUser.has(followedUser)) {
      this.followersByUser.set(followedUser, new Set<UID>());
    }
    this.followersByUser.get(followedUser)?.add(follower);

    if (!this.followedByUser.has(follower)) {
      this.followedByUser.set(follower, new Set<UID>());
    }

    if (followedUser !== this.root) {
      let newFollowDistance;
      if (follower === this.root) {
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
  }

  removeFollower(unfollowedUser: UID, follower: UID) {
    this.followersByUser.get(unfollowedUser)?.delete(follower);
    this.followedByUser.get(follower)?.delete(unfollowedUser);

    if (unfollowedUser === this.root) {
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
  }

  // TODO subscription methods for followersByUser and followedByUser. and maybe messagesByTime. and replies
  followerCount(address: HexKey) {
    const id = ID(address);
    return this.followersByUser.get(id)?.size ?? 0;
  }

  followedByFriendsCount(address: HexKey) {
    let count = 0;
    const id = ID(address);
    for (const follower of this.followersByUser.get(id) ?? []) {
      if (this.followedByUser.get(this.root)?.has(follower)) {
        count++; // should we stop at 10?
      }
    }
    return count;
  }

  followedByFriends(address: HexKey) {
    const id = ID(address);
    const set = new Set<HexKey>();
    for (const follower of this.followersByUser.get(id) ?? []) {
      if (this.followedByUser.get(this.root)?.has(follower)) {
        set.add(STR(follower));
      }
    }
    return set;
  }

  getFollowedByUser(user: HexKey, includeSelf = false): Set<HexKey> {
    const userId = ID(user);
    const set = new Set<HexKey>();
    for (const id of this.followedByUser.get(userId) || []) {
      set.add(STR(id));
    }
    if (includeSelf) {
      set.add(user);
    }
    return set;
  }

  getFollowersByUser(address: HexKey): Set<HexKey> {
    const userId = ID(address);
    const set = new Set<HexKey>();
    for (const id of this.followersByUser.get(userId) || []) {
      set.add(STR(id));
    }
    return set;
  }
}

export const socialGraphInstance = new SocialGraph("");
