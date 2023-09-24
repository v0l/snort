import { HexKey, RelaySettings, u256, PinEncrypted, PinEncryptedPayload } from "@snort/system";
import { UserPreferences } from "Login";
import { SubscriptionEvent } from "Subscription";

/**
 * Stores latest copy of an item
 */
interface Newest<T> {
  item: T;
  timestamp: number;
}

export enum LoginSessionType {
  PrivateKey = "private_key",
  PublicKey = "public_key",
  Nip7 = "nip7",
  Nip46 = "nip46",
  Nip7os = "nip7_os",
}

export interface SnortAppData {
  mutedWords: Array<string>
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
  privateKeyData?: PinEncrypted | PinEncryptedPayload;

  /**
   * BIP39-generated, hex-encoded entropy
   */
  generatedEntropy?: string;

  /**
   * Current users public key
   */
  publicKey?: HexKey;

  /**
   * All the logged in users relays
   */
  relays: Newest<Record<string, RelaySettings>>;

  /**
   * A list of pubkeys this user follows
   */
  follows: Newest<Array<HexKey>>;

  /**
   * A list of tags this user follows
   */
  tags: Newest<Array<string>>;

  /**
   * A list of event ids this user has pinned
   */
  pinned: Newest<Array<u256>>;

  /**
   * A list of event ids this user has bookmarked
   */
  bookmarked: Newest<Array<u256>>;

  /**
   * A list of pubkeys this user has muted
   */
  muted: Newest<Array<HexKey>>;

  /**
   * A list of pubkeys this user has muted privately
   */
  blocked: Newest<Array<HexKey>>;

  /**
   * Latest notification
   */
  latestNotification: number;

  /**
   * Timestamp of last read notification
   */
  readNotifications: number;

  /**
   * Users cusom preferences
   */
  preferences: UserPreferences;

  /**
   * Snort subscriptions licences
   */
  subscriptions: Array<SubscriptionEvent>;

  /**
   * Remote signer relays (NIP-46)
   */
  remoteSignerRelays?: Array<string>;

  /**
   * Snort application data
   */
  appData: Newest<SnortAppData>;
}
