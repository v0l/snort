import { useEffect, useMemo } from "react";
import { TaggedNostrEvent, EventKind, RequestBuilder, NoteCollection, NostrLink } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";

import { bech32ToHex, debounce, findTag, getNewest, getNewestEventTagsByKey, unwrap } from "SnortUtils";
import { makeNotification, sendNotification } from "Notifications";
import useEventPublisher from "Hooks/useEventPublisher";
import useModeration from "Hooks/useModeration";
import useLogin from "Hooks/useLogin";
import {
  SnortAppData,
  addSubscription,
  setAppData,
  setBlocked,
  setBookmarked,
  setFollows,
  setMuted,
  setPinned,
  setRelays,
  setTags,
} from "Login";
import { SnortPubKey } from "Const";
import { SubscriptionEvent } from "Subscription";
import useRelaysFeedFollows from "./RelaysFeedFollows";
import { FollowsFeed, GiftsCache, Notifications, UserRelays } from "Cache";
import { Nip28Chats, Nip4Chats } from "chat";
import { useRefreshFeedCache } from "Hooks/useRefreshFeedcache";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
  const login = useLogin();
  const { publicKey: pubKey, readNotifications, follows } = login;
  const { isMuted } = useModeration();
  const { publisher, system } = useEventPublisher();

  useRefreshFeedCache(Notifications, true);
  useRefreshFeedCache(FollowsFeed, true);
  useRefreshFeedCache(GiftsCache, true);

  useEffect(() => {
    system.checkSigs = login.appData.item.preferences.checkSigs;
  }, [login]);

  // write appdata after 10s of no changes
  useEffect(() => {
    return debounce(10_000, async () => {
      if (publisher && login.appData.item) {
        const ev = await publisher.appData(login.appData.item, "snort");
        await system.BroadcastEvent(ev);
      }
    });
  }, [login.appData.timestamp]);

  const subLogin = useMemo(() => {
    if (!login || !pubKey) return null;

    const b = new RequestBuilder(`login:${pubKey.slice(0, 12)}`);
    b.withOptions({
      leaveOpen: true,
    });
    b.withFilter()
      .authors([pubKey])
      .kinds([EventKind.ContactList, EventKind.Relays, EventKind.MuteList, EventKind.PinList]);
    b.withFilter().authors([pubKey]).kinds([EventKind.CategorizedBookmarks]).tag("d", ["follow", "bookmark"]);
    if (CONFIG.features.subscriptions && !login.readonly) {
      b.withFilter().authors([pubKey]).kinds([EventKind.AppData]).tag("d", ["snort"]);
      b.withFilter()
        .relay("wss://relay.snort.social/")
        .kinds([EventKind.SnortSubscriptions])
        .authors([bech32ToHex(SnortPubKey)])
        .tag("p", [pubKey])
        .limit(10);
    }

    const n4Sub = Nip4Chats.subscription(login);
    if (n4Sub) {
      b.add(n4Sub);
    }
    const n28Sub = Nip28Chats.subscription(login);
    if (n28Sub) {
      b.add(n28Sub);
    }
    return b;
  }, [login]);

  const loginFeed = useRequestBuilder(NoteCollection, subLogin);

  // update relays and follow lists
  useEffect(() => {
    if (loginFeed.data) {
      const contactList = getNewest(loginFeed.data.filter(a => a.kind === EventKind.ContactList));
      if (contactList) {
        const pTags = contactList.tags.filter(a => a[0] === "p").map(a => a[1]);
        setFollows(login, pTags, contactList.created_at * 1000);

        FollowsFeed.backFillIfMissing(system, pTags);
      }

      const relays = getNewest(loginFeed.data.filter(a => a.kind === EventKind.Relays));
      if (relays) {
        const parsedRelays = relays.tags
          .filter(a => a[0] === "r")
          .map(a => {
            return [
              a[1],
              {
                read: a[2] === "read" || a[2] === undefined,
                write: a[2] === "write" || a[2] === undefined,
              },
            ];
          });
        setRelays(login, Object.fromEntries(parsedRelays), relays.created_at * 1000);
      }

      Nip4Chats.onEvent(loginFeed.data);
      Nip28Chats.onEvent(loginFeed.data);

      if (publisher) {
        const subs = loginFeed.data.filter(
          a => a.kind === EventKind.SnortSubscriptions && a.pubkey === bech32ToHex(SnortPubKey),
        );
        Promise.all(
          subs.map(async a => {
            const dx = await publisher.decryptDm(a);
            if (dx) {
              const ex = JSON.parse(dx);
              return {
                id: a.id,
                ...ex,
              } as SubscriptionEvent;
            }
          }),
        ).then(a => addSubscription(login, ...a.filter(a => a !== undefined).map(unwrap)));

        const appData = getNewest(loginFeed.data.filter(a => a.kind === EventKind.AppData));
        if (appData) {
          publisher.decryptGeneric(appData.content, appData.pubkey).then(d => {
            setAppData(login, JSON.parse(d) as SnortAppData, appData.created_at * 1000);
          });
        }
      }
    }
  }, [loginFeed, publisher]);

  // send out notifications
  useEffect(() => {
    if (loginFeed.data) {
      const replies = loginFeed.data.filter(
        a => a.kind === EventKind.TextNote && !isMuted(a.pubkey) && a.created_at > readNotifications,
      );
      replies.forEach(async nx => {
        const n = await makeNotification(nx);
        if (n) {
          sendNotification(login, n);
        }
      });
    }
  }, [loginFeed, readNotifications]);

  async function handleMutedFeed(mutedFeed: TaggedNostrEvent[]) {
    const latest = getNewest(mutedFeed);
    if (!latest) return;

    const muted = NostrLink.fromTags(latest.tags);
    setMuted(
      login,
      muted.map(a => a.id),
      latest.created_at * 1000,
    );

    if (latest?.content && publisher && pubKey) {
      try {
        const privMutes = await publisher.nip4Decrypt(latest.content, pubKey);
        const blocked = JSON.parse(privMutes) as Array<Array<string>>;
        const keys = blocked.filter(a => a[0] === "p").map(a => a[1]);
        setBlocked(login, keys, latest.created_at * 1000);
      } catch (error) {
        console.debug("Failed to parse mute list", error, latest);
      }
    }
  }

  function handlePinnedFeed(pinnedFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(pinnedFeed, "e");
    if (newest) {
      setPinned(login, newest.keys, newest.createdAt * 1000);
    }
  }

  function handleTagFeed(tagFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(tagFeed, "t");
    if (newest) {
      setTags(login, newest.keys, newest.createdAt * 1000);
    }
  }

  function handleBookmarkFeed(bookmarkFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(bookmarkFeed, "e");
    if (newest) {
      setBookmarked(login, newest.keys, newest.createdAt * 1000);
    }
  }

  useEffect(() => {
    if (loginFeed.data) {
      const mutedFeed = loginFeed.data.filter(a => a.kind === EventKind.MuteList);
      handleMutedFeed(mutedFeed);

      const pinnedFeed = loginFeed.data.filter(a => a.kind === EventKind.PinList);
      handlePinnedFeed(pinnedFeed);

      const tagsFeed = loginFeed.data.filter(
        a => a.kind === EventKind.CategorizedBookmarks && findTag(a, "d") === "follow",
      );
      handleTagFeed(tagsFeed);

      const bookmarkFeed = loginFeed.data.filter(
        a => a.kind === EventKind.CategorizedBookmarks && findTag(a, "d") === "bookmark",
      );
      handleBookmarkFeed(bookmarkFeed);
    }
  }, [loginFeed]);

  useEffect(() => {
    UserRelays.buffer(follows.item).catch(console.error);
    system.ProfileLoader.TrackMetadata(follows.item); // always track follows profiles
  }, [follows.item]);

  const fRelays = useRelaysFeedFollows(follows.item);
  useEffect(() => {
    UserRelays.bulkSet(fRelays).catch(console.error);
  }, [fRelays]);
}
