"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileCacheExpire = exports.HashtagRegex = exports.DefaultConnectTimeout = void 0;
/**
 * Websocket re-connect timeout
 */
exports.DefaultConnectTimeout = 2000;
/**
 * Hashtag regex
 */
// eslint-disable-next-line no-useless-escape
exports.HashtagRegex = /(#[^\s!@#$%^&*()=+.\/,\[{\]};:'"?><]+)/g;
/**
 * How long profile cache should be considered valid for
 */
exports.ProfileCacheExpire = 1000 * 60 * 60 * 6;
//# sourceMappingURL=Const.js.map