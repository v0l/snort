import { HexKey, KeyStorage, UserState } from "@snort/system";

import { DisplayAs } from "@/Components/Feed/DisplayAsSelector";
import { UserPreferences } from "@/Utils/Login/index";
import { SubscriptionEvent } from "@/Utils/Subscription";

/**
 * Stores latest copy of an item
 */
export interface Newest<T> {
  item: T;
  timestamp: number;
}

export const enum LoginSessionType {
  PrivateKey = "private_key",
  PublicKey = "public_key",
  Nip7 = "nip7",
  Nip46 = "nip46",
  Nip7os = "nip7_os",
}

export interface SnortAppData {
  preferences: UserPreferences;
}

export interface LoginSession {
  /**
   * Unique ID to identify this session
   */
  id: string;

  /**
   * Type of login session
   */
  type: LoginSessionType;

  /**
   * Current user private key
   * @deprecated Moving to pin encrypted storage
   */
  privateKey?: HexKey;

  /**
   * If this session cannot sign events
   */
  readonly: boolean;

  /**
   * Encrypted private key
   */
  privateKeyData?: KeyStorage;

  /**
   * BIP39-generated, hex-encoded entropy
   */
  generatedEntropy?: string;

  /**
   * Current users public key
   */
  publicKey?: HexKey;

  state: UserState<SnortAppData>;

  /**
   * Timestamp of last read notification
   */
  readNotifications: number;

  /**
   * Snort subscriptions licences
   */
  subscriptions: Array<SubscriptionEvent>;

  /**
   * Remote signer relays (NIP-46)
   */
  remoteSignerRelays?: Array<string>;

  /**
   * A list of chats which we have joined (NIP-28/NIP-29)
   */
  extraChats: Array<string>;

  /**
   * Is login session in stalker mode
   */
  stalker: boolean;

  /**
   * Display feed as list or grid
   */
  feedDisplayAs?: DisplayAs;
}
