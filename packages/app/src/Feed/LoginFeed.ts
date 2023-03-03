import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getNewest } from "Util";
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
import { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";

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

  const subMuted = useMemo(() => {
    if (!pubKey) return null;

    const sub = new Subscriptions();
    sub.Id = "login:muted";
    sub.Kinds = new Set([EventKind.PubkeyLists]);
    sub.Authors = new Set([pubKey]);
    sub.DTags = new Set([Lists.Muted]);
    sub.Limit = 1;

    return sub;
  }, [pubKey]);

  const subTags = useMemo(() => {
    if (!pubKey) return null;

    const sub = new Subscriptions();
    sub.Id = "login:tags";
    sub.Kinds = new Set([EventKind.TagLists]);
    sub.Authors = new Set([pubKey]);
    sub.DTags = new Set([Lists.Followed]);
    sub.Limit = 1;

    return sub;
  }, [pubKey]);

  const subPinned = useMemo(() => {
    if (!pubKey) return null;

    const sub = new Subscriptions();
    sub.Id = "login:pinned";
    sub.Kinds = new Set([EventKind.NoteLists]);
    sub.Authors = new Set([pubKey]);
    sub.DTags = new Set([Lists.Pinned]);
    sub.Limit = 1;

    return sub;
  }, [pubKey]);

  const subBookmarks = useMemo(() => {
    if (!pubKey) return null;

    const sub = new Subscriptions();
    sub.Id = "login:bookmarks";
    sub.Kinds = new Set([EventKind.NoteLists]);
    sub.Authors = new Set([pubKey]);
    sub.DTags = new Set([Lists.Bookmarked]);
    sub.Limit = 1;

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
  const mutedFeed = useSubscription(subMuted, { leaveOpen: true, cache: true });
  const pinnedFeed = useSubscription(subPinned, { leaveOpen: true, cache: true });
  const tagsFeed = useSubscription(subTags, { leaveOpen: true, cache: true });
  const bookmarkFeed = useSubscription(subBookmarks, { leaveOpen: true, cache: true });

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

  useEffect(() => {
    const muted = getMutedKeys(mutedFeed.store.notes);
    dispatch(setMuted(muted));

    const newest = getNewest(mutedFeed.store.notes);
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
  }, [dispatch, mutedFeed.store]);

  useEffect(() => {
    const newest = getNewest(pinnedFeed.store.notes);
    if (newest) {
      const keys = newest.tags.filter(p => p && p.length === 2 && p[0] === "e").map(p => p[1]);
      dispatch(
        setPinned({
          keys,
          createdAt: newest.created_at,
        })
      );
    }
  }, [dispatch, pinnedFeed.store]);

  useEffect(() => {
    const newest = getNewest(tagsFeed.store.notes);
    if (newest) {
      const tags = newest.tags.filter(p => p && p.length === 2 && p[0] === "t").map(p => p[1]);
      dispatch(
        setTags({
          tags,
          createdAt: newest.created_at,
        })
      );
    }
  }, [dispatch, tagsFeed.store]);

  useEffect(() => {
    const newest = getNewest(bookmarkFeed.store.notes);
    if (newest) {
      const keys = newest.tags.filter(p => p && p.length === 2 && p[0] === "e").map(p => p[1]);
      dispatch(
        setBookmarked({
          keys,
          createdAt: newest.created_at,
        })
      );
    }
  }, [dispatch, bookmarkFeed.store]);

  useEffect(() => {
    const dms = dmsFeed.store.notes.filter(a => a.kind === EventKind.DirectMessage);
    dispatch(addDirectMessage(dms));
  }, [dispatch, dmsFeed.store]);
}

async function decryptBlocked(raw: TaggedRawEvent, pubKey: HexKey, privKey?: HexKey) {
  const ev = new Event(raw);
  if (pubKey && privKey) {
    return await ev.DecryptData(raw.content, privKey, pubKey);
  } else {
    return await barrierNip07(() => window.nostr.nip04.decrypt(pubKey, raw.content));
  }
}
