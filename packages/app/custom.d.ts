/// <reference types="@webbtc/webln-types" />
/// <reference types="vite/client" />

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
  icon: string;
  navLogo: string | null;
  httpCache: string;
  animalNamePlaceholders: boolean;
  defaultZapPoolFee: number;
  features: {
    analytics: boolean;
    subscriptions: boolean;
    zapPool: boolean;
    deck: boolean;
    communityLeaders: boolean;
    nostrAddress: boolean;
    pushNotifications: boolean;
  };
  defaultPreferences: {
    hideMutedNotes: boolean;
    defaultRootTab: "following" | "for-you";
    imgProxyConfig: { url: string; key: string; salt: string } | undefined;
  };
  signUp: {
    quickStart: boolean;
    defaultFollows: Array<string>;
  };
  media: {
    bypassImgProxyError: boolean;
    preferLargeMedia: boolean;
  };
  communityLeaders?: {
    list: string;
  };

  // Filter urls from nav sidebar
  hideFromNavbar: Array<string>;

  // Limit deck to certain subscriber tier
  deckSubKind?: number;

  showDeck?: boolean;

  // Create toast notifications when publishing notes
  noteCreatorToast: boolean;

  eventLinkPrefix: NostrPrefix;
  profileLinkPrefix: NostrPrefix;
  defaultRelays: Record<string, RelaySettings>;
  showPowIcon: boolean;
  // show nip5 beside usernames
  showNip05: boolean;

  // Alby wallet oAuth config
  alby?: {
    clientId: string;
    clientSecret: string;
  };

  // public chat channels for site
  chatChannels?: Array<{
    type: "telegram";
    value: string;
  }>;
};

/**
 * Build git hash
 */
declare const __SNORT_VERSION__: string;
