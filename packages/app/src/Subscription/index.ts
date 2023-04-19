import { unixNow } from "Util";

export enum SubscriptionType {
  Supporter = 0,
  Premium = 1,
}

export enum LockedFeatures {
  MultiAccount = 1,
  NostrAddress = 2,
  Badge = 3,
  DeepL = 4,
  RelayRetention = 5,
  RelayBackup = 6,
  RelayAccess = 7,
  LNProxy = 8,
  EmailBridge = 9,
}

export const Plans = [
  {
    id: SubscriptionType.Supporter,
    price: 5_000,
    disabled: false,
    unlocks: [
      LockedFeatures.MultiAccount,
      LockedFeatures.NostrAddress,
      LockedFeatures.Badge,
      LockedFeatures.RelayAccess,
    ],
  },
  {
    id: SubscriptionType.Premium,
    price: 20_000,
    disabled: true,
    unlocks: [
      LockedFeatures.DeepL,
      LockedFeatures.RelayBackup,
      LockedFeatures.RelayRetention,
      LockedFeatures.LNProxy,
      LockedFeatures.EmailBridge,
    ],
  },
];

export interface SubscriptionEvent {
  id: string;
  type: SubscriptionType;
  start: number;
  end: number;
}

export function getActiveSubscriptions(s: Array<SubscriptionEvent>) {
  const now = unixNow();
  return s.filter(a => a.start <= now && a.end > now);
}

export function getCurrentSubscription(s: Array<SubscriptionEvent>) {
  return getActiveSubscriptions(s)[0];
}
