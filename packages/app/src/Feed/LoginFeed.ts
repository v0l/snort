import { useEffect, useMemo } from "react";
import { TaggedNostrEvent, Lists, EventKind, FlatNoteStore, RequestBuilder, NoteCollection } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";

import { bech32ToHex, getNewest, getNewestEventTagsByKey, unwrap } from "SnortUtils";
import { makeNotification, sendNotification } from "Notifications";
import useEventPublisher from "Hooks/useEventPublisher";
import { getMutedKeys } from "Feed/MuteList";
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
import { System } from "index";
import { Nip28Chats, Nip4Chats } from "chat";
import { useRefreshFeedCache } from "Hooks/useRefreshFeedcache";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
  const login = useLogin();
  const { publicKey: pubKey, readNotifications, follows } = login;
  const { isMuted } = useModeration();
  const publisher = useEventPublisher();

  useRefreshFeedCache(Notifications, true);
  useRefreshFeedCache(FollowsFeed, true);
  useRefreshFeedCache(GiftsCache, true);

  const subLogin = useMemo(() => {
    if (!login || !pubKey) return null;

    const b = new RequestBuilder(`login:${pubKey.slice(0, 12)}`);
    b.withOptions({
      leaveOpen: true,
    });
    b.withFilter().authors([pubKey]).kinds([EventKind.ContactList]);
    b.withFilter().authors([pubKey]).kinds([EventKind.AppData]).tag("d", ["snort"]);
    b.withFilter()
      .relay("wss://relay.snort.social")
      .kinds([EventKind.SnortSubscriptions])
      .authors([bech32ToHex(SnortPubKey)])
      .tag("p", [pubKey])
      .limit(1);

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

  const subLists = useMemo(() => {
    if (!pubKey) return null;
    const b = new RequestBuilder(`login:${pubKey.slice(0, 12)}:lists`);
    b.withOptions({
      leaveOpen: true,
    });
    b.withFilter()
      .authors([pubKey])
      .kinds([EventKind.PubkeyLists])
      .tag("d", [Lists.Muted, Lists.Followed, Lists.Pinned, Lists.Bookmarked]);

    return b;
  }, [pubKey]);

  const loginFeed = useRequestBuilder(NoteCollection, subLogin);

  // update relays and follow lists
  useEffect(() => {
    if (loginFeed.data && publisher) {
      const contactList = getNewest(loginFeed.data.filter(a => a.kind === EventKind.ContactList));
      if (contactList) {
        if (contactList.content !== "" && contactList.content !== "{}") {
          const relays = JSON.parse(contactList.content);
          setRelays(login, relays, contactList.created_at * 1000);
        }
        const pTags = contactList.tags.filter(a => a[0] === "p").map(a => a[1]);
        setFollows(login, pTags, contactList.created_at * 1000);

        FollowsFeed.backFillIfMissing(System, pTags);
      }

      Nip4Chats.onEvent(loginFeed.data);
      Nip28Chats.onEvent(loginFeed.data);

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

  function handleMutedFeed(mutedFeed: TaggedNostrEvent[]) {
    const muted = getMutedKeys(mutedFeed);
    setMuted(login, muted.keys, muted.createdAt * 1000);

    if (muted.raw && (muted.raw?.content?.length ?? 0) > 0 && pubKey) {
      publisher
        ?.nip4Decrypt(muted.raw.content, pubKey)
        .then(plaintext => {
          try {
            const blocked = JSON.parse(plaintext);
            const keys = blocked.filter((p: string) => p && p.length === 2 && p[0] === "p").map((p: string) => p[1]);
            setBlocked(login, keys, unwrap(muted.raw).created_at * 1000);
          } catch (error) {
            console.debug("Couldn't parse JSON");
          }
        })
        .catch(error => console.warn(error));
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

  const listsFeed = useRequestBuilder(FlatNoteStore, subLists);

  useEffect(() => {
    if (listsFeed.data) {
      const getList = (evs: readonly TaggedNostrEvent[], list: Lists) =>
        evs.filter(a => unwrap(a.tags.find(b => b[0] === "d"))[1] === list);

      const mutedFeed = getList(listsFeed.data, Lists.Muted);
      handleMutedFeed(mutedFeed);

      const pinnedFeed = getList(listsFeed.data, Lists.Pinned);
      handlePinnedFeed(pinnedFeed);

      const tagsFeed = getList(listsFeed.data, Lists.Followed);
      handleTagFeed(tagsFeed);

      const bookmarkFeed = getList(listsFeed.data, Lists.Bookmarked);
      handleBookmarkFeed(bookmarkFeed);
    }
  }, [listsFeed]);

  useEffect(() => {
    UserRelays.buffer(follows.item).catch(console.error);
    System.ProfileLoader.TrackMetadata(follows.item); // always track follows profiles
  }, [follows.item]);

  const fRelays = useRelaysFeedFollows(follows.item);
  useEffect(() => {
    UserRelays.bulkSet(fRelays).catch(console.error);
  }, [fRelays]);
}
