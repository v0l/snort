import { HexKey, RelaySettings, u256 } from "@snort/nostr";
import { UserPreferences } from "Login";
import { SubscriptionEvent } from "Subscription";

/**
 * Stores latest copy of an item
 */
interface Newest<T> {
  item: T;
  timestamp: number;
}

export interface LoginSession {
  /**
   * Current user private key
   */
  privateKey?: HexKey;

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
   * Current active subscription
   */
  currentSubscription?: SubscriptionEvent;
}
