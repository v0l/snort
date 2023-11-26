/**
 * Websocket re-connect timeout
 */
export const DefaultConnectTimeout = 2000;

/**
 * Hashtag regex
 */
// eslint-disable-next-line no-useless-escape
export const HashtagRegex = /(#[^\s!@#$%^&*()=+.\/,\[{\]};:'"?><]+)/g;

/**
 * Legacy tag reference regex
 */
export const TagRefRegex = /(#\[\d+\])/gm;

/**
 * How long profile cache should be considered valid for
 */
export const ProfileCacheExpire = 1_000 * 60 * 60 * 6;

/**
 * How long before relay lists should be refreshed
 */
export const RelayListCacheExpire = 1_000 * 60 * 60 * 12;

/**
 * Extract file extensions regex
 */
// eslint-disable-next-line no-useless-escape
export const FileExtensionRegex = /\.([\w]{1,7})$/i;

/**
 * Simple lightning invoice regex
 */
export const InvoiceRegex = /(lnbc\w+)/i;

/*
 * Regex to match any base64 string
 */
export const CashuRegex = /(cashuA[A-Za-z0-9_-]{0,10000}={0,3})/i;

/**
 * Regex to match any npub/nevent/naddr/nprofile/note
 */
export const MentionNostrEntityRegex = /@n(pub|profile|event|ote|addr|)1[acdefghjklmnpqrstuvwxyz023456789]+/g;

/**
 * Regex to match markdown code content
 */
export const MarkdownCodeRegex = /(```.+?```)/gms;
