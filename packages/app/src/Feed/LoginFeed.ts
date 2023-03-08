import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";

import { getNewest, getNewestEventTagsByKey, unwrap } from "Util";
import { makeNotification } from "Notifications";
import { TaggedRawEvent, HexKey, Lists } from "@snort/nostr";
import { Event, EventKind, Subscriptions } from "@snort/nostr";
import {
  addDirectMessage,
  setFollows,
  setRelays,
  setMuted,
  setTags,
  setPinned,
  setBookmarked,
  setBlocked,
  sendNotification,
  setLatestNotifications,
} from "State/Login";
import { RootState } from "State/Store";
import useSubscription from "Feed/Subscription";
import { barrierNip07 } from "Feed/EventPublisher";
import { getMutedKeys } from "Feed/MuteList";
import useModeration from "Hooks/useModeration";
import useRelaysFeedFollows from "Feed/RelaysFeedFollows";
import { FollowsRelays } from "State/Relays";

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
    follows,
  } = useSelector((s: RootState) => s.login);
  const { isMuted } = useModeration();

  const subMetadata = useMemo(() => {
    if (!pubKey) return null;

    const sub = new Subscriptions();
    sub.Id = `login:meta`;
    sub.Authors = new Set([pubKey]);
    sub.Kinds = new Set([EventKind.ContactList]);
    sub.Limit = 2;

    return sub;
  }, [pubKey]);

  const subNotification = useMemo(() => {
    if (!pubKey) return null;

    const sub = new Subscriptions();
    sub.Id = "login:notifications";
    // todo: add zaps
    sub.Kinds = new Set([EventKind.TextNote]);
    sub.PTags = new Set([pubKey]);
    sub.Limit = 1;
    return sub;
  }, [pubKey]);

  const subLists = useMemo(() => {
    if (!pubKey) return null;

    const sub = new Subscriptions();
    sub.Id = "login:muted";
    sub.Kinds = new Set([EventKind.PubkeyLists]);
    sub.Authors = new Set([pubKey]);
    sub.DTags = new Set([Lists.Muted, Lists.Followed, Lists.Pinned, Lists.Bookmarked]);

    return sub;
  }, [pubKey]);

  const subDms = useMemo(() => {
    if (!pubKey) return null;

    const dms = new Subscriptions();
    dms.Id = "login:dms";
    dms.Kinds = new Set([EventKind.DirectMessage]);
    dms.PTags = new Set([pubKey]);

    const dmsFromME = new Subscriptions();
    dmsFromME.Authors = new Set([pubKey]);
    dmsFromME.Kinds = new Set([EventKind.DirectMessage]);
    dms.AddSubscription(dmsFromME);

    return dms;
  }, [pubKey]);

  const metadataFeed = useSubscription(subMetadata, {
    leaveOpen: true,
    cache: true,
  });
  const notificationFeed = useSubscription(subNotification, {
    leaveOpen: true,
    cache: true,
  });
  const dmsFeed = useSubscription(subDms, { leaveOpen: true, cache: true });
  const listsFeed = useSubscription(subLists, { leaveOpen: true, cache: true });

  useEffect(() => {
    const contactList = metadataFeed.store.notes.filter(a => a.kind === EventKind.ContactList);
    for (const cl of contactList) {
      if (cl.content !== "" && cl.content !== "{}") {
        const relays = JSON.parse(cl.content);
        dispatch(setRelays({ relays, createdAt: cl.created_at }));
      }
      const pTags = cl.tags.filter(a => a[0] === "p").map(a => a[1]);
      dispatch(setFollows({ keys: pTags, createdAt: cl.created_at }));
    }
  }, [dispatch, metadataFeed.store]);

  useEffect(() => {
    const replies = notificationFeed.store.notes.filter(
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
  }, [dispatch, notificationFeed.store, readNotifications]);

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

  useEffect(() => {
    const getList = (evs: TaggedRawEvent[], list: Lists) =>
      evs.filter(a => unwrap(a.tags.find(b => b[0] === "d"))[1] === list);

    const mutedFeed = getList(listsFeed.store.notes, Lists.Muted);
    handleMutedFeed(mutedFeed);

    const pinnedFeed = getList(listsFeed.store.notes, Lists.Pinned);
    handlePinnedFeed(pinnedFeed);

    const tagsFeed = getList(listsFeed.store.notes, Lists.Followed);
    handleTagFeed(tagsFeed);

    const bookmarkFeed = getList(listsFeed.store.notes, Lists.Bookmarked);
    handleBookmarkFeed(bookmarkFeed);
  }, [dispatch, listsFeed.store]);

  useEffect(() => {
    const dms = dmsFeed.store.notes.filter(a => a.kind === EventKind.DirectMessage);
    dispatch(addDirectMessage(dms));
  }, [dispatch, dmsFeed.store]);

  const fRelays = useRelaysFeedFollows(follows);
  useEffect(() => {
    FollowsRelays.bulkSet(fRelays).catch(console.error);
  }, [dispatch, fRelays]);
}

async function decryptBlocked(raw: TaggedRawEvent, pubKey: HexKey, privKey?: HexKey) {
  const ev = new Event(raw);
  if (pubKey && privKey) {
    return await ev.DecryptData(raw.content, privKey, pubKey);
  } else {
    return await barrierNip07(() => window.nostr.nip04.decrypt(pubKey, raw.content));
  }
}
