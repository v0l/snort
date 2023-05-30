import { HexKey, RelaySettings } from "System";
import * as secp from "@noble/curves/secp256k1";
import * as utils from "@noble/curves/abstract/utils";

import { DefaultRelays, SnortPubKey } from "Const";
import { LoginStore, UserPreferences, LoginSession } from "Login";
import { generateBip39Entropy, entropyToPrivateKey } from "nip6";
import { bech32ToHex, dedupeById, randomSample, sanitizeRelayUrl, unixNowMs, unwrap } from "SnortUtils";
import { SubscriptionEvent } from "Subscription";
import { EventPublisher } from "System/EventPublisher";
import { System } from "index";

export function setRelays(state: LoginSession, relays: Record<string, RelaySettings>, createdAt: number) {
  if (state.relays.timestamp >= createdAt) {
    return;
  }

  // filter out non-websocket urls
  const filtered = new Map<string, RelaySettings>();
  for (const [k, v] of Object.entries(relays)) {
    if (k.startsWith("wss://") || k.startsWith("ws://")) {
      const url = sanitizeRelayUrl(k);
      if (url) {
        filtered.set(url, v as RelaySettings);
      }
    }
  }
  state.relays.item = Object.fromEntries(filtered.entries());
  state.relays.timestamp = createdAt;
  LoginStore.updateSession(state);
}

export function removeRelay(state: LoginSession, addr: string) {
  delete state.relays.item[addr];
  LoginStore.updateSession(state);
}

export function updatePreferences(state: LoginSession, p: UserPreferences) {
  state.preferences = p;
  LoginStore.updateSession(state);
}

export function logout(k: HexKey) {
  LoginStore.removeSession(k);
}

export function markNotificationsRead(state: LoginSession) {
  state.readNotifications = unixNowMs();
  LoginStore.updateSession(state);
}

export function clearEntropy(state: LoginSession) {
  state.generatedEntropy = undefined;
  LoginStore.updateSession(state);
}

/**
 * Generate a new key and login with this generated key
 */
export async function generateNewLogin() {
  const ent = generateBip39Entropy();
  const entropy = utils.bytesToHex(ent);
  const privateKey = entropyToPrivateKey(ent);
  let newRelays: Record<string, RelaySettings> = {};

  try {
    const rsp = await fetch("https://api.nostr.watch/v1/online");
    if (rsp.ok) {
      const online: string[] = await rsp.json();
      const pickRandom = randomSample(online, 4);
      const relayObjects = pickRandom.map(a => [unwrap(sanitizeRelayUrl(a)), { read: true, write: true }]);
      newRelays = {
        ...Object.fromEntries(relayObjects),
        ...Object.fromEntries(DefaultRelays.entries()),
      };
    }
  } catch (e) {
    console.warn(e);
  }

  const publicKey = utils.bytesToHex(secp.schnorr.getPublicKey(privateKey));
  const publisher = new EventPublisher(System, publicKey, privateKey);
  const ev = await publisher.contactList([bech32ToHex(SnortPubKey), publicKey], newRelays);
  publisher.broadcast(ev);

  LoginStore.loginWithPrivateKey(privateKey, entropy, newRelays);
}

export function generateRandomKey() {
  const privateKey = utils.bytesToHex(secp.schnorr.utils.randomPrivateKey());
  const publicKey = utils.bytesToHex(secp.schnorr.getPublicKey(privateKey));
  return {
    privateKey,
    publicKey,
  };
}

export function setTags(state: LoginSession, tags: Array<string>, ts: number) {
  if (state.tags.timestamp >= ts) {
    return;
  }
  state.tags.item = tags;
  state.tags.timestamp = ts;
  LoginStore.updateSession(state);
}

export function setMuted(state: LoginSession, muted: Array<string>, ts: number) {
  if (state.muted.timestamp >= ts) {
    return;
  }
  state.muted.item = muted;
  state.muted.timestamp = ts;
  LoginStore.updateSession(state);
}

export function setBlocked(state: LoginSession, blocked: Array<string>, ts: number) {
  if (state.blocked.timestamp >= ts) {
    return;
  }
  state.blocked.item = blocked;
  state.blocked.timestamp = ts;
  LoginStore.updateSession(state);
}

export function setFollows(state: LoginSession, follows: Array<string>, ts: number) {
  if (state.follows.timestamp >= ts) {
    return;
  }
  state.follows.item = follows;
  state.follows.timestamp = ts;
  LoginStore.updateSession(state);
}

export function setPinned(state: LoginSession, pinned: Array<string>, ts: number) {
  if (state.pinned.timestamp >= ts) {
    return;
  }
  state.pinned.item = pinned;
  state.pinned.timestamp = ts;
  LoginStore.updateSession(state);
}

export function setBookmarked(state: LoginSession, bookmarked: Array<string>, ts: number) {
  if (state.bookmarked.timestamp >= ts) {
    return;
  }
  state.bookmarked.item = bookmarked;
  state.bookmarked.timestamp = ts;
  LoginStore.updateSession(state);
}

export function addSubscription(state: LoginSession, ...subs: SubscriptionEvent[]) {
  const newSubs = dedupeById([...(state.subscriptions || []), ...subs]);
  if (newSubs.length !== state.subscriptions.length) {
    state.subscriptions = newSubs;
    LoginStore.updateSession(state);
  }
}
