import { RelaySettings } from "Nostr/Connection";

/**
 * Add-on api for snort features
 */
export const ApiHost = "https://api.snort.social";

/**
 * Void.cat file upload service url
 */
export const VoidCatHost = "https://void.cat";

/**
 * Websocket re-connect timeout
 */
export const DefaultConnectTimeout = 2000;

/**
 * How long profile cache should be considered valid for
 */
export const ProfileCacheExpire = (1_000 * 60 * 5);

/**
 * Default bootstrap relays
 */
export const DefaultRelays = new Map<string, RelaySettings>([
    ["wss://relay.snort.social", { read: true, write: true }],
    ["wss://eden.nostr.land", { read: true, write: true }],
    ["wss://nostr-pub.semisol.dev", { read: true, write: true }]
]);

/**
 * List of recommended follows for new users
 */
export const RecommendedFollows = [
    "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2", // jack
    "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d", // fiatjaf
    "020f2d21ae09bf35fcdfb65decf1478b846f5f728ab30c5eaabcd6d081a81c3e", // adam3us
    "6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93", // gigi
    "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed", // Kieran
    "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245", // jb55
    "e33fe65f1fde44c6dc17eeb38fdad0fceaf1cae8722084332ed1e32496291d42", // wiz
    "00000000827ffaa94bfea288c3dfce4422c794fbb96625b6b31e9049f729d700", // cameri
    "A341F45FF9758F570A21B000C17D4E53A3A497C8397F26C0E6D61E5ACFFC7A98", // Saylor
    "E88A691E98D9987C964521DFF60025F60700378A4879180DCBBB4A5027850411", // NVK
    "C4EABAE1BE3CF657BC1855EE05E69DE9F059CB7A059227168B80B89761CBC4E0", // jackmallers
    "85080D3BAD70CCDCD7F74C29A44F55BB85CBCD3DD0CBB957DA1D215BDB931204", // preston
    "C49D52A573366792B9A6E4851587C28042FB24FA5625C6D67B8C95C8751ACA15", // holdonaut
    "83E818DFBECCEA56B0F551576B3FD39A7A50E1D8159343500368FA085CCD964B", // jeffbooth
    "3F770D65D3A764A9C5CB503AE123E62EC7598AD035D836E2A810F3877A745B24", // DerekRoss
    "472F440F29EF996E92A186B8D320FF180C855903882E59D50DE1B8BD5669301E", // MartyBent
    "1577e4599dd10c863498fe3c20bd82aafaf829a595ce83c5cf8ac3463531b09b", // yegorpetrov
    "04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9", // ODELL
    "7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194", // verbiricha
    "52b4a076bcbbbdc3a1aefa3735816cf74993b1b8db202b01c883c58be7fad8bd", // semisol
];

/**
 * Regex to match email address
 */
export const EmailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/**
 * Generic URL regex
 */
export const UrlRegex = /((?:http|ftp|https):\/\/(?:[\w+?\.\w+])+(?:[a-zA-Z0-9\~\!\@\#\$\%\^\&\*\(\)_\-\=\+\\\/\?\.\:\;\'\,]*)?)/i;

/**
 * Extract file extensions regex
 */
export const FileExtensionRegex = /\.([\w]+)$/i;

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
export const YoutubeUrlRegex = /(?:https?:\/\/)?(?:www|m\.)?(?:youtu\.be\/|youtube\.com\/(?:shorts\/|embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/;

/**
 * Tweet Regex
 */
export const TweetUrlRegex = /https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/

/**
 * Hashtag regex
 */
export const HashtagRegex = /(#[^\s!@#$%^&*()=+.\/,\[{\]};:'"?><]+)/;

/**
 * Tidal share link regex
 */
export const TidalRegex = /tidal\.com\/(?:browse\/)?(\w+)\/([a-z0-9-]+)/i;

/**
 * SoundCloud regex
 */
export const SoundCloudRegex = /soundcloud\.com\/(?!live)([a-zA-Z0-9]+)\/([a-zA-Z0-9-]+)/

/**
 * Mixcloud regex
 */

export const MixCloudRegex = /mixcloud\.com\/(?!live)([a-zA-Z0-9]+)\/([a-zA-Z0-9-]+)/
