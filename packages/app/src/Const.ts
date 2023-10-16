import { RelaySettings } from "@snort/system";
import { bech32ToHex } from "SnortUtils";

/**
 * 1 Hour in seconds
 */
export const Hour = 60 * 60;

/**
 * 1 Day in seconds
 */
export const Day = Hour * 24;

/**
 * Add-on api for snort features
 */
export const ApiHost = "https://api.snort.social";

/**
 * LibreTranslate endpoint
 */
export const TranslateHost = "https://translate.snort.social";

/**
 * Void.cat file upload service url
 */
export const VoidCatHost = "https://void.cat";

/**
 * Kierans pubkey
 */
export const KieranPubKey = "npub1v0lxxxxutpvrelsksy8cdhgfux9l6a42hsj2qzquu2zk7vc9qnkszrqj49";

/**
 * Official snort account
 */
export const SnortPubKey = "npub1sn0rtcjcf543gj4wsg7fa59s700d5ztys5ctj0g69g2x6802npjqhjjtws";

/**
 * Websocket re-connect timeout
 */
export const DefaultConnectTimeout = 2000;

/**
 * How long profile cache should be considered valid for
 */
export const ProfileCacheExpire = 1_000 * 60 * 60 * 6;

/**
 * Default bootstrap relays
 */
export const DefaultRelays = new Map<string, RelaySettings>([
  ["wss://relay.snort.social/", { read: true, write: true }],
  ["wss://nostr.wine/", { read: true, write: false }],
  ["wss://nos.lol/", { read: true, write: true }],
]);

/**
 * Default search relays
 */
export const SearchRelays = ["wss://relay.nostr.band"];

export const DeveloperAccounts = [
  bech32ToHex(KieranPubKey), // kieran
  bech32ToHex("npub1g53mukxnjkcmr94fhryzkqutdz2ukq4ks0gvy5af25rgmwsl4ngq43drvk"), // Martti
  bech32ToHex("npub107jk7htfv243u0x5ynn43scq9wrxtaasmrwwa8lfu2ydwag6cx2quqncxg"), // verbiricha
  bech32ToHex("npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac"), // Karnage
];

/**
 * Snort imgproxy details
 */
export const DefaultImgProxy = {
  url: "https://imgproxy.snort.social",
  key: "a82fcf26aa0ccb55dfc6b4bd6a1c90744d3be0f38429f21a8828b43449ce7cebe6bdc2b09a827311bef37b18ce35cb1e6b1c60387a254541afa9e5b4264ae942",
  salt: "a897770d9abf163de055e9617891214e75a9016d748f8ef865e6ffbcb9ed932295659549773a22a019a5f06d0b440c320be411e3fddfe784e199e4f03d74bd9b",
};

/**
 * NIP06-defined derivation path for private keys
 */
export const DerivationPath = "m/44'/1237'/0'/0/0";

/**
 * Regex to match email address
 */
export const EmailRegex =
  // eslint-disable-next-line no-useless-escape
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/**
 * Regex to match a mnemonic seed
 */
export const MnemonicRegex = /(\w+)/g;

/**
 * Extract file extensions regex
 */
// eslint-disable-next-line no-useless-escape
export const FileExtensionRegex = /\.([\w]{1,7})$/i;

/**
 * Extract note reactions regex
 */
export const MentionRegex = /(#\[\d+\])/gi;

/**
 * Simple lightning invoice regex
 */
export const InvoiceRegex = /(lnbc\w+)/i;

/**
 * YouTube URL regex
 */
export const YoutubeUrlRegex =
  /(?:https?:\/\/)?(?:www|m\.)?(?:youtu\.be\/|youtube\.com\/(?:live\/|shorts\/|embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/;

/**
 * Tweet Regex
 */
export const TweetUrlRegex = /https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/;

/**
 * Hashtag regex
 */
// eslint-disable-next-line no-useless-escape
export const HashtagRegex = /(#[^\s!@#$%^&*()=+.\/,\[{\]};:'"?><]+)/g;

/**
 * Tidal share link regex
 */
export const TidalRegex = /tidal\.com\/(?:browse\/)?(\w+)\/([a-z0-9-]+)/i;

/**
 * SoundCloud regex
 */
export const SoundCloudRegex = /soundcloud\.com\/(?!live)([a-zA-Z0-9]+)\/([a-zA-Z0-9-]+)/;

/**
 * Mixcloud regex
 */
export const MixCloudRegex = /mixcloud\.com\/(?!live)([a-zA-Z0-9]+)\/([a-zA-Z0-9-]+)/;

/**
 * Spotify embed regex
 */
export const SpotifyRegex = /open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/;

/**
 * Twitch embed regex
 */
export const TwitchRegex = /twitch.tv\/([a-z0-9_]+$)/i;

/**
 * Apple Music embed regex
 */
export const AppleMusicRegex =
  /music\.apple\.com\/([a-z]{2}\/)?(?:album|playlist)\/[\w\d-]+\/([.a-zA-Z0-9-]+)(?:\?i=\d+)?/i;

/**
 * Nostr Nests embed regex
 */
export const NostrNestsRegex = /nostrnests\.com\/[a-zA-Z0-9]+/i;

/*
 * Magnet link parser
 */
export const MagnetRegex = /(magnet:[\S]+)/i;

/**
 * Wavlake embed regex
 */
export const WavlakeRegex =
  /https?:\/\/(?:player\.|www\.)?wavlake\.com\/(?!top|new|artists|account|activity|login|preferences|feed|profile)(?:(?:track|album)\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}|[a-z-]+)/i;

/*
 * Regex to match any base64 string
 */
export const CashuRegex = /(cashuA[A-Za-z0-9_-]{0,10000}={0,3})/i;
