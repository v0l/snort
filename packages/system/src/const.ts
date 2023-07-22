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
 * How long profile cache should be considered valid for
 */
export const ProfileCacheExpire = 1_000 * 60 * 60 * 6;
