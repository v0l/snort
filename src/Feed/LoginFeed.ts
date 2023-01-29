import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { makeNotification } from "Notifications";
import { TaggedRawEvent, HexKey, Lists } from "Nostr";
import EventKind from "Nostr/EventKind";
import Event from "Nostr/Event";
import { Subscriptions } from "Nostr/Subscriptions";
import { addDirectMessage, setFollows, setRelays, setMuted, setBlocked, sendNotification } from "State/Login";
import { RootState } from "State/Store";
import { mapEventToProfile, MetadataCache  } from "State/Users";
import { getDb } from "State/Users/Db";
import useSubscription from "Feed/Subscription";
import { getDisplayName } from "Element/ProfileImage";
import { barierNip07 } from "Feed/EventPublisher";
import { getMutedKeys, getNewest } from "Feed/MuteList";
import { MentionRegex } from "Const";
import useModeration from "Hooks/useModeration";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
    const dispatch = useDispatch();
    const { publicKey: pubKey, privateKey: privKey } = useSelector((s: RootState) => s.login);
    const { isMuted } = useModeration();

    const subMetadata = useMemo(() => {
        if (!pubKey) return null;

        let sub = new Subscriptions();
        sub.Id = `login:meta`;
        sub.Authors = new Set([pubKey]);
        sub.Kinds = new Set([EventKind.ContactList, EventKind.SetMetadata]);
        sub.Limit = 2

        return sub;
    }, [pubKey]);

    const subNotification = useMemo(() => {
        if (!pubKey) return null;

        let sub = new Subscriptions();
        sub.Id = "login:notifications";
        sub.Kinds = new Set([EventKind.TextNote]);
        sub.PTags = new Set([pubKey]);
        sub.Limit = 1;
        return sub;
    }, [pubKey]);

    const subMuted = useMemo(() => {
        if (!pubKey) return null;

        let sub = new Subscriptions();
        sub.Id = "login:muted";
        sub.Kinds = new Set([EventKind.Lists]);
        sub.Authors = new Set([pubKey]);
        sub.DTag = Lists.Muted;
        sub.Limit = 1;

        return sub;
    }, [pubKey]);

    const subDms = useMemo(() => {
        if (!pubKey) return null;

        let dms = new Subscriptions();
        dms.Id = "login:dms";
        dms.Kinds = new Set([EventKind.DirectMessage]);
        dms.PTags = new Set([pubKey]);

        let dmsFromME = new Subscriptions();
        dmsFromME.Authors = new Set([pubKey]);
        dmsFromME.Kinds = new Set([EventKind.DirectMessage]);
        dms.AddSubscription(dmsFromME);

        return dms;
    }, [pubKey]);

    const metadataFeed = useSubscription(subMetadata, { leaveOpen: true });
    const notificationFeed = useSubscription(subNotification, { leaveOpen: true });
    const dmsFeed = useSubscription(subDms, { leaveOpen: true });
    const mutedFeed = useSubscription(subMuted, { leaveOpen: true });

    useEffect(() => {
        let contactList = metadataFeed.store.notes.filter(a => a.kind === EventKind.ContactList);
        let metadata = metadataFeed.store.notes.filter(a => a.kind === EventKind.SetMetadata);
        let profiles = metadata.map(a => mapEventToProfile(a))
            .filter(a => a !== undefined)
            .map(a => a!);

        for (let cl of contactList) {
            if (cl.content !== "" && cl.content !== "{}") {
                let relays = JSON.parse(cl.content);
                dispatch(setRelays({ relays, createdAt: cl.created_at }));
            }
            let pTags = cl.tags.filter(a => a[0] === "p").map(a => a[1]);
            dispatch(setFollows({ keys: pTags, createdAt: cl.created_at }));
        }

        (async () => {
            let maxProfile = profiles.reduce((acc, v) => {
                if (v.created > acc.created) {
                    acc.profile = v;
                    acc.created = v.created;
                }
                return acc;
            }, { created: 0, profile: null as MetadataCache | null });
            if (maxProfile.profile) {
                const db = getDb()
                let existing = await db.find(maxProfile.profile.pubkey);
                if ((existing?.created ?? 0) < maxProfile.created) {
                    await db.put(maxProfile.profile);
                }
            }
        })().catch(console.warn);
    }, [dispatch, metadataFeed.store]);

    useEffect(() => {
        const replies = notificationFeed.store.notes.filter(a => a.kind === EventKind.TextNote && !isMuted(a.pubkey))
        replies.forEach(nx => {
          makeNotification(nx).then(notification => {
            if (notification) {
              // @ts-ignore
              dispatch(sendNotification(notification))
            }
          })
        })
    }, [dispatch, notificationFeed.store]);

    useEffect(() => {
      const muted = getMutedKeys(mutedFeed.store.notes)
      dispatch(setMuted(muted))

      const newest = getNewest(mutedFeed.store.notes)
      if (newest && newest.content.length > 0 && pubKey) {
        decryptBlocked(newest, pubKey, privKey).then((plaintext) => {
          try {
            const blocked = JSON.parse(plaintext)
            const keys = blocked.filter((p:any) => p && p.length === 2 && p[0] === "p").map((p: any) => p[1])
            dispatch(setBlocked({
              keys,
              createdAt: newest.created_at,
            }))
          } catch(error) {
            console.debug("Couldn't parse JSON")
          }
        }).catch((error) => console.warn(error))
      }
    }, [dispatch, mutedFeed.store])

    useEffect(() => {
        let dms = dmsFeed.store.notes.filter(a => a.kind === EventKind.DirectMessage);
        dispatch(addDirectMessage(dms));
    }, [dispatch, dmsFeed.store]);
}


async function decryptBlocked(raw: TaggedRawEvent, pubKey: HexKey, privKey?: HexKey) {
  const ev = new Event(raw)
  if (pubKey && privKey) {
    return await ev.DecryptData(raw.content, privKey, pubKey)
  } else {
    return await barierNip07(() => window.nostr.nip04.decrypt(pubKey, raw.content));
  }
}
