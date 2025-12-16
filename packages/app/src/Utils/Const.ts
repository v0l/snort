/**
 * 1 Hour in seconds
 */
export const Hour = 60 * 60;

/**
 * 1 Day in seconds
 */
export const Day = Hour * 24;

/**
 * Day this project started
 */
export const Birthday = new Date(2022, (12 - 1), 17);

/**
 * Add-on api for snort features
 */
export const ApiHost = "https://api.snort.social";

/**
 * Kierans pubkey
 */
export const KieranPubKey = "npub1v0lxxxxutpvrelsksy8cdhgfux9l6a42hsj2qzquu2zk7vc9qnkszrqj49";

/**
 * Official snort account
 */
export const SnortPubKey = "npub1sn0rtcjcf543gj4wsg7fa59s700d5ztys5ctj0g69g2x6802npjqhjjtws";

/**
 * Default search relays
 */
export const SearchRelays = ["wss://relay.nostr.band/", "wss://search.nos.today/", "wss://relay.noswhere.com/"];

/**
 * Snort imgproxy details
 */
export const DefaultImgProxy = {
  url: "https://imgproxy.v0l.io",
  key: "a82fcf26aa0ccb55dfc6b4bd6a1c90744d3be0f38429f21a8828b43449ce7cebe6bdc2b09a827311bef37b18ce35cb1e6b1c60387a254541afa9e5b4264ae942",
  salt: "a897770d9abf163de055e9617891214e75a9016d748f8ef865e6ffbcb9ed932295659549773a22a019a5f06d0b440c320be411e3fddfe784e199e4f03d74bd9b",
};

/**
 * Blaster relays
 */
export const Blasters = [];

/**
 * Regex to match email address
 */
export const EmailRegex =
  // eslint-disable-next-line no-useless-escape
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

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
 * https://music.youtube.com/watch?v=KyF9hKd-EC4&list=RDTMAK5uy_kset8DisdE7LSD4TNjEVvrKRTmG7a56sY
 */
export const YoutubeUrlRegex =
  /(?:https?:\/\/)?(?:www|m\.)?(?:youtu\.be\/|youtube\.com\/(?:live\/|shorts\/|embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})((?:&list=)(?:(\w|-)+))?/;

/**
 * Hashtag regex
 */
// eslint-disable-next-line no-useless-escape
export const HashtagRegex = /(#[^\s!@#$%^&*()=+./,[{\]};:'"?><]+)/g;

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

/*
 * Max username length - profile/settings
 */
export const MaxUsernameLength = 100;

/*
 * Max about length - profile/settings
 */
export const MaxAboutLength = 1000;

/*
 * Snort backend publishes rates
 */
export const SnortPubkey = "npub1sn0rtcjcf543gj4wsg7fa59s700d5ztys5ctj0g69g2x6802npjqhjjtws";

/**
 * List of relay monitor relays
 */
export const MonitorRelays = [
  "wss://relaypag.es",
  "wss://relay.nostr.watch",
  "wss://history.nostr.watch",
  "wss://monitorlizard.nostr1.com",
];
