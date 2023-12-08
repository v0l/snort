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

declare module "*.md" {
  const value: string;
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
  navLogo: string | null;
  httpCache: string;
  animalNamePlaceholders: boolean;
  defaultZapPoolFee: number;
  bypassImgProxyError: boolean;
  features: {
    analytics: boolean;
    subscriptions: boolean;
    deck: boolean;
    zapPool: boolean;
  };
  defaultPreferences: {
    checkSigs: boolean;
  };
  signUp: {
    moderation: boolean;
  };
  // Filter urls from nav sidebar
  hideFromNavbar: Array<string>;
  // Limit deck to certain subscriber tier
  deckSubKind?: number;
  showDeck?: boolean;
  // Create toast notifications when publishing notes
  noteCreatorToast?: boolean;
  eventLinkPrefix: NostrPrefix;
  profileLinkPrefix: NostrPrefix;
  defaultRelays: Record<string, RelaySettings>;
};

/**
 * Single relay (Debug)
 */
declare const SINGLE_RELAY: string | undefined;

/**
 * Build git hash
 */
declare const __SNORT_VERSION__: string;
