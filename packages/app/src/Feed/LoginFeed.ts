import { useEffect, useMemo } from "react";
import { TaggedRawEvent, HexKey, Lists, EventKind } from "@snort/nostr";

import { bech32ToHex, getNewest, getNewestEventTagsByKey, unwrap } from "Util";
import { makeNotification, sendNotification } from "Notifications";
import useEventPublisher, { barrierNip07 } from "Feed/EventPublisher";
import { getMutedKeys } from "Feed/MuteList";
import useModeration from "Hooks/useModeration";
import { FlatNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";
import { EventExt } from "System/EventExt";
import { DmCache } from "Cache";
import useLogin from "Hooks/useLogin";
import { addSubscription, setBlocked, setBookmarked, setFollows, setMuted, setPinned, setRelays, setTags } from "Login";
import { SnortPubKey } from "Const";
import { SubscriptionEvent } from "Subscription";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
  const login = useLogin();
  const { publicKey: pubKey, privateKey: privKey, readNotifications, muted: stateMuted } = login;
  const { isMuted } = useModeration();
  const publisher = useEventPublisher();

  const subLogin = useMemo(() => {
    if (!pubKey) return null;

    const b = new RequestBuilder("login");
    b.withOptions({
      leaveOpen: true,
    });
    b.withFilter().authors([pubKey]).kinds([EventKind.ContactList]);
    b.withFilter().kinds([EventKind.TextNote]).tag("p", [pubKey]).limit(1);
    b.withFilter()
      .kinds([EventKind.SnortSubscriptions])
      .authors([bech32ToHex(SnortPubKey)])
      .tag("p", [pubKey])
      .limit(1);

    const dmSince = DmCache.newest();
    b.withFilter().authors([pubKey]).kinds([EventKind.DirectMessage]).since(dmSince);
    b.withFilter().kinds([EventKind.DirectMessage]).tag("p", [pubKey]).since(dmSince);
    return b;
  }, [pubKey]);

  const subLists = useMemo(() => {
    if (!pubKey) return null;
    const b = new RequestBuilder("login:lists");
    b.withOptions({
      leaveOpen: true,
    });
    b.withFilter()
      .authors([pubKey])
      .kinds([EventKind.PubkeyLists])
      .tag("d", [Lists.Muted, Lists.Followed, Lists.Pinned, Lists.Bookmarked]);

    return b;
  }, [pubKey]);

  const loginFeed = useRequestBuilder<FlatNoteStore>(FlatNoteStore, subLogin);

  // update relays and follow lists
  useEffect(() => {
    if (loginFeed.data) {
      const contactList = getNewest(loginFeed.data.filter(a => a.kind === EventKind.ContactList));
      if (contactList) {
        if (contactList.content !== "" && contactList.content !== "{}") {
          const relays = JSON.parse(contactList.content);
          setRelays(login, relays, contactList.created_at * 1000);
        }
        const pTags = contactList.tags.filter(a => a[0] === "p").map(a => a[1]);
        setFollows(login, pTags, contactList.created_at * 1000);
      }

      const dms = loginFeed.data.filter(a => a.kind === EventKind.DirectMessage);
      DmCache.bulkSet(dms);

      const subs = loginFeed.data.filter(
        a => a.kind === EventKind.SnortSubscriptions && a.pubkey === bech32ToHex(SnortPubKey)
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
        })
      ).then(a => addSubscription(login, ...a.filter(a => a !== undefined).map(unwrap)));
    }
  }, [loginFeed]);

  // send out notifications
  useEffect(() => {
    if (loginFeed.data) {
      const replies = loginFeed.data.filter(
        a => a.kind === EventKind.TextNote && !isMuted(a.pubkey) && a.created_at > readNotifications
      );
      replies.forEach(async nx => {
        const n = await makeNotification(nx);
        if (n) {
          sendNotification(login, n);
        }
      });
    }
  }, [loginFeed, readNotifications]);

  function handleMutedFeed(mutedFeed: TaggedRawEvent[]) {
    const muted = getMutedKeys(mutedFeed);
    setMuted(login, muted.keys, muted.createdAt * 1000);

    if (muted.raw && (muted.raw?.content?.length ?? 0) > 0 && pubKey) {
      decryptBlocked(muted.raw, pubKey, privKey)
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

  function handlePinnedFeed(pinnedFeed: TaggedRawEvent[]) {
    const newest = getNewestEventTagsByKey(pinnedFeed, "e");
    if (newest) {
      setPinned(login, newest.keys, newest.createdAt * 1000);
    }
  }

  function handleTagFeed(tagFeed: TaggedRawEvent[]) {
    const newest = getNewestEventTagsByKey(tagFeed, "t");
    if (newest) {
      setTags(login, newest.keys, newest.createdAt * 1000);
    }
  }

  function handleBookmarkFeed(bookmarkFeed: TaggedRawEvent[]) {
    const newest = getNewestEventTagsByKey(bookmarkFeed, "e");
    if (newest) {
      setBookmarked(login, newest.keys, newest.createdAt * 1000);
    }
  }

  const listsFeed = useRequestBuilder<FlatNoteStore>(FlatNoteStore, subLists);

  useEffect(() => {
    if (listsFeed.data) {
      const getList = (evs: readonly TaggedRawEvent[], list: Lists) =>
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

  /*const fRelays = useRelaysFeedFollows(follows);
  useEffect(() => {
    FollowsRelays.bulkSet(fRelays).catch(console.error);
  }, [dispatch, fRelays]);*/
}

async function decryptBlocked(raw: TaggedRawEvent, pubKey: HexKey, privKey?: HexKey) {
  if (pubKey && privKey) {
    return await EventExt.decryptData(raw.content, privKey, pubKey);
  } else {
    return await barrierNip07(() => window.nostr.nip04.decrypt(pubKey, raw.content));
  }
}
