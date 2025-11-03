import { bech32ToHex, unixNowMs } from "@snort/shared";
import {
  EventPublisher,
  KeyStorage,
  Nip7Signer,
  Nip46Signer,
  Nip55Signer,
  PrivateKeySigner,
  RelaySettings,
  SystemInterface,
  UserMetadata,
} from "@snort/system";

import { GiftsCache } from "@/Cache";
import { dedupeById, deleteRefCode, unwrap } from "@/Utils";
import { Blasters } from "@/Utils/Const";
import { LoginSession, LoginSessionType, LoginStore, SnortAppData, UserPreferences } from "@/Utils/Login/index";
import { entropyToPrivateKey, generateBip39Entropy } from "@/Utils/nip6";
import { SubscriptionEvent } from "@/Utils/Subscription";

import { Nip7OsSigner } from "./Nip7OsSigner";
import { bytesToHex } from "@noble/hashes/utils.js";

export function logout(id: string) {
  LoginStore.removeSession(id);
  GiftsCache.clear();
  deleteRefCode();
  localStorage.clear();
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
 * Generate a new key
 */
export async function generateNewLoginKeys() {
  const entropy = generateBip39Entropy();
  const privateKey = await entropyToPrivateKey(entropy);
  return { entropy, privateKey };
}

/**
 * Login with newly generated key
 */
export async function generateNewLogin(
  keys: { entropy: Uint8Array; privateKey: string },
  system: SystemInterface,
  pin: (key: string) => Promise<KeyStorage>,
  profile: UserMetadata,
) {
  const { entropy, privateKey } = keys;
  const newRelays = {} as Record<string, RelaySettings>;

  for (const [k, v] of Object.entries(CONFIG.defaultRelays)) {
    if (!newRelays[k]) {
      newRelays[k] = v;
    }
  }

  // connect to new relays
  await Promise.all(Object.entries(newRelays).map(([k, v]) => system.ConnectToRelay(k, v)));

  const publisher = EventPublisher.privateKey(privateKey);
  const publicKey = publisher.pubKey;

  // Create new contact list following self and site account
  const contactList = [publicKey, ...CONFIG.signUp.defaultFollows.map(a => bech32ToHex(a))].map(a => ["p", a]) as Array<
    [string, string]
  >;
  const ev = await publisher.contactList(contactList, newRelays);
  system.BroadcastEvent(ev);

  // Create relay metadata event
  const ev2 = await publisher.relayList(newRelays);
  system.BroadcastEvent(ev2);
  Promise.all(Blasters.map(a => system.WriteOnceToRelay(a, ev2)));

  // Publish new profile
  const ev3 = await publisher.metadata(profile);
  system.BroadcastEvent(ev3);
  Promise.all(Blasters.map(a => system.WriteOnceToRelay(a, ev3)));

  LoginStore.loginWithPrivateKey(await pin(privateKey), bytesToHex(entropy), newRelays);
}

export function updateSession(id: string, fn: (state: LoginSession) => void) {
  const session = LoginStore.get(id);
  if (session) {
    fn(session);
    LoginStore.updateSession(session);
  }
}

export function setAppData(state: LoginSession, data: SnortAppData) {
  state.state.setAppData(data);
  LoginStore.updateSession(state);
}

export function updateAppData(id: string, fn: (data: SnortAppData) => SnortAppData) {
  const session = LoginStore.get(id);
  if (session?.state.appdata) {
    const next = fn(session.state.appdata);
    setAppData(session, next);
  }
}

export function setPreference(obj: Partial<UserPreferences>) {
  const { id } = LoginStore.snapshot();
  const session = LoginStore.get(id);
  if (!session?.state.appdata) return;
  const p = {
    preferences: {
      ...session.state.appdata.preferences,
      ...obj,
    },
  };
  session.state.setAppData(p);
}

export async function saveAppData(id: string) {
  const session = LoginStore.get(id);
  if (session?.state.appdata) {
    await session.state.saveAppData();
  }
}

export function addSubscription(state: LoginSession, ...subs: SubscriptionEvent[]) {
  const newSubs = dedupeById([...(state.subscriptions || []), ...subs]);
  if (newSubs.length !== state.subscriptions.length) {
    state.subscriptions = newSubs;
    LoginStore.updateSession(state);
  }
}

export function sessionNeedsPin(l: LoginSession) {
  return l.privateKeyData && l.privateKeyData.shouldUnlock();
}

export function createPublisher(l: LoginSession) {
  switch (l.type) {
    case LoginSessionType.PrivateKey: {
      return EventPublisher.privateKey(unwrap(l.privateKeyData as KeyStorage).value);
    }
    case LoginSessionType.Nip46: {
      const relayArgs = (l.remoteSignerRelays ?? []).map(a => `relay=${encodeURIComponent(a)}`);
      const inner = new PrivateKeySigner(unwrap(l.privateKeyData as KeyStorage).value);
      const nip46 = new Nip46Signer(`bunker://${unwrap(l.publicKey)}?${[...relayArgs].join("&")}`, inner);
      nip46.on("oauth", url => {
        window.open(url, CONFIG.appNameCapitalized, "width=600,height=800,popup=yes");
      });
      return new EventPublisher(nip46, unwrap(l.publicKey));
    }
    case LoginSessionType.Nip7os: {
      return new EventPublisher(new Nip7OsSigner(), unwrap(l.publicKey));
    }
    case LoginSessionType.Nip7: {
      return new EventPublisher(new Nip7Signer(), unwrap(l.publicKey));
    }
    case LoginSessionType.Nip55: {
      return new EventPublisher(new Nip55Signer(), unwrap(l.publicKey));
    }
  }
}
