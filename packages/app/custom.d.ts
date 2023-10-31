/// <reference types="@webbtc/webln-types" />

declare module "*.jpg" {
  const value: unknown;
  export default value;
}

declare module "*.svg" {
  const value: unknown;
  export default value;
}

declare module "*.webp" {
  const value: string;
  export default value;
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.css" {
  const stylesheet: CSSStyleSheet;
  export default stylesheet;
}

declare module "translations/*.json" {
  const value: Record<string, string>;
  export default value;
}

declare module "emojilib" {
  const value: Record<string, string>;
  export default value;
}

declare const CONFIG: {
  appName: string;
  appNameCapitalized: string;
  appTitle: string;
  hostname: string;
  nip05Domain: string;
  favicon: string;
  appleTouchIconUrl: string;
  httpCache: string;
  animalNamePlaceholders: boolean;
  defaultZapPoolFee?: number;
  features: {
    analytics: boolean;
    subscriptions: boolean;
    deck: boolean;
    zapPool: boolean;
  };
  eventLinkPrefix: NostrPrefix;
  profileLinkPrefix: NostrPrefix;
  defaultRelays: Record<string, RelaySettings>;
};

/**
 * Single relay (Debug)
 */
declare const SINGLE_RELAY: string | undefined;
