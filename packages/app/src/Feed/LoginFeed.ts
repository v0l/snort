import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";
import { TaggedRawEvent, HexKey, Lists, EventKind } from "@snort/nostr";

import { bech32ToHex, getNewest, getNewestEventTagsByKey, unwrap } from "Util";
import { makeNotification } from "Notifications";
import {
  setFollows,
  setRelays,
  setMuted,
  setTags,
  setPinned,
  setBookmarked,
  setBlocked,
  sendNotification,
  setLatestNotifications,
  addSubscription,
} from "State/Login";
import { RootState } from "State/Store";
import useEventPublisher, { barrierNip07 } from "Feed/EventPublisher";
import { getMutedKeys } from "Feed/MuteList";
import useModeration from "Hooks/useModeration";
import { FlatNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";
import { EventExt } from "System/EventExt";
import { DmCache } from "Cache";
import { SnortPubKey } from "Const";
import { SubscriptionEvent } from "Subscription";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
  const dispatch = useDispatch();
  const {
    publicKey: pubKey,
    privateKey: privKey,
    latestMuted,
    readNotifications,
  } = useSelector((s: RootState) => s.login);
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
          dispatch(setRelays({ relays, createdAt: contactList.created_at }));
        }
        const pTags = contactList.tags.filter(a => a[0] === "p").map(a => a[1]);
        dispatch(setFollows({ keys: pTags, createdAt: contactList.created_at }));
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
      ).then(a => dispatch(addSubscription(a.filter(a => a !== undefined).map(unwrap))));
    }
  }, [dispatch, loginFeed]);

  // send out notifications
  useEffect(() => {
    if (loginFeed.data) {
      const replies = loginFeed.data.filter(
        a => a.kind === EventKind.TextNote && !isMuted(a.pubkey) && a.created_at > readNotifications
      );
      replies.forEach(nx => {
        dispatch(setLatestNotifications(nx.created_at));
        makeNotification(nx).then(notification => {
          if (notification) {
            (dispatch as ThunkDispatch<RootState, undefined, AnyAction>)(sendNotification(notification));
          }
        });
      });
    }
  }, [dispatch, loginFeed, readNotifications]);

  function handleMutedFeed(mutedFeed: TaggedRawEvent[]) {
    const muted = getMutedKeys(mutedFeed);
    dispatch(setMuted(muted));

    const newest = getNewest(mutedFeed);
    if (newest && newest.content.length > 0 && pubKey && newest.created_at > latestMuted) {
      decryptBlocked(newest, pubKey, privKey)
        .then(plaintext => {
          try {
            const blocked = JSON.parse(plaintext);
            const keys = blocked.filter((p: string) => p && p.length === 2 && p[0] === "p").map((p: string) => p[1]);
            dispatch(
              setBlocked({
                keys,
                createdAt: newest.created_at,
              })
            );
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
      dispatch(setPinned(newest));
    }
  }

  function handleTagFeed(tagFeed: TaggedRawEvent[]) {
    const newest = getNewestEventTagsByKey(tagFeed, "t");
    if (newest) {
      dispatch(
        setTags({
          tags: newest.keys,
          createdAt: newest.createdAt,
        })
      );
    }
  }

  function handleBookmarkFeed(bookmarkFeed: TaggedRawEvent[]) {
    const newest = getNewestEventTagsByKey(bookmarkFeed, "e");
    if (newest) {
      dispatch(setBookmarked(newest));
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
  }, [dispatch, listsFeed]);

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
