/**
 * Regex to match email address
 */
export const EmailRegex =
  // eslint-disable-next-line no-useless-escape
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/**
 * Match any NIP-19 code
 */
export const Bech32Regex = /(n(?:pub|profile|event|ote|addr|req|relay|chat)1[acdefghjklmnpqrstuvwxyz023456789]+)/;
