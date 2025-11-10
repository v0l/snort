import { EventBuilder, EventExt, NostrEvent, NostrLink } from "@snort/system";
import { NostrPrefix, bech32ToHex, sha256, unixNow } from "@snort/shared";
import { useState } from "react";

import { KieranPubKey } from "@/Utils/Const";

// Button Components
import AsyncButton from "@/Components/Button/AsyncButton";
import BackButton from "@/Components/Button/BackButton";
import CloseButton from "@/Components/Button/CloseButton";
import IconButton from "@/Components/Button/IconButton";
import LogoutButton from "@/Components/Button/LogoutButton";
import NavLink from "@/Components/Button/NavLink";

// Icon Components
import Icon from "@/Components/Icons/Icon";
import Spinner from "@/Components/Icons/Spinner";
import Alby from "@/Components/Icons/Alby";
import Cashu from "@/Components/Icons/Cashu";
import Nostrich from "@/Components/Icons/Nostrich";
import BlueWallet from "@/Components/Icons/BlueWallet";
import ECash from "@/Components/Icons/ECash";
import NWC from "@/Components/Icons/NWC";
import { ToggleSwitch } from "@/Components/Icons/Toggle";

// Text Components
import Text from "@/Components/Text/Text";
import HighlightedText from "@/Components/Text/HighlightedText";

// User Components
import Avatar from "@/Components/User/Avatar";
import Username from "@/Components/User/Username";
import DisplayName from "@/Components/User/DisplayName";
import FollowButton from "@/Components/User/FollowButton";
import FollowsYou from "@/Components/User/FollowsYou";
import Nip05 from "@/Components/User/Nip05";
import ProfileImage from "@/Components/User/ProfileImage";
import { ProfileLink } from "@/Components/User/ProfileLink";
import { AvatarGroup } from "@/Components/User/AvatarGroup";
import MuteButton from "@/Components/User/MuteButton";
import FollowDistanceIndicator from "@/Components/User/FollowDistanceIndicator";

// Embed Components
import Hashtag from "@/Components/Embed/Hashtag";
import Mention from "@/Components/Embed/Mention";
import Invoice from "@/Components/Embed/Invoice";
import MagnetLink from "@/Components/Embed/MagnetLink";

// Event Components
import Note from "@/Components/Event/EventComponent";
import NoteTime from "@/Components/Event/Note/NoteTime";
import ZapButton from "@/Components/Event/ZapButton";
import { ClientTag } from "@/Components/Event/Note/ClientTag";
import Poll from "@/Components/Event/Poll";
import { LongFormText } from "@/Components/Event/LongFormText";
import { ZapGoal } from "@/Components/Event/ZapGoal";
import { ZapsSummary } from "@/Components/Event/ZapsSummary";
import NoteHeader from "@/Components/Event/Note/NoteHeader";

// Other Components
import Copy from "@/Components/Copy/Copy";
import { ProxyImg } from "@/Components/ProxyImg";
import QrCode from "@/Components/QrCode";
import Collapsed, { CollapsedSection } from "@/Components/Collapsed";
import Modal from "@/Components/Modal/Modal";
import { WarningNotice } from "@/Components/WarningNotice/WarningNotice";
import Progress from "@/Components/Progress/Progress";
import TabSelectors, { Tab } from "@/Components/TabSelectors/TabSelectors";
import PageSpinner from "@/Components/PageSpinner";
import Toaster, { Toastore } from "@/Components/Toaster/Toaster";
import { Markdown } from "@/Components/Event/Markdown";

// Feed Components
import LoadMore from "@/Components/Feed/LoadMore";

// Embed - Music & Video
import SpotifyEmbed from "@/Components/Embed/SpotifyEmbed";
import YoutubeEmbed from "@/Components/Embed/YoutubeEmbed";
import TwitchEmbed from "@/Components/Embed/TwitchEmbed";
import AppleMusicEmbed from "@/Components/Embed/AppleMusicEmbed";
import TidalEmbed from "@/Components/Embed/TidalEmbed";
import SoundCloudEmbed from "@/Components/Embed/SoundCloudEmded";
import WavlakeEmbed from "@/Components/Embed/WavlakeEmbed";
import MixCloudEmbed from "@/Components/Embed/MixCloudEmbed";
import NostrNestsEmbed from "@/Components/Embed/NostrNestsEmbed";
import CashuNuts from "@/Components/Embed/CashuNuts";

// More User Components
import NoteToSelf from "@/Components/User/NoteToSelf";
import BadgeList from "@/Components/User/BadgeList";
import { UserWebsiteLink } from "@/Components/User/UserWebsiteLink";
import FollowedBy from "@/Components/User/FollowedBy";

// Relay Components
import PaidRelayLabel from "@/Components/Relay/paid";
import UptimeLabel from "@/Components/Relay/uptime-label";

// Trending Components
import TrendingHashtags from "@/Components/Trending/TrendingHashtags";
import TrendingUsers from "@/Components/Trending/TrendingUsers";
import TrendingPosts from "@/Components/Trending/TrendingPosts";

// Other Components
import KindName from "@/Components/kind-name";
import SuggestedProfiles from "@/Components/SuggestedProfiles";
import ZapAmountLabel from "@/Components/zap-amount";

import { magnetURIDecode } from "@/Utils";
import { LiveEvent } from "@/Components/LiveStream/LiveEvent";
import { setTheme } from "@/Hooks/useTheme";
import { NoteProvider } from "@/Components/Event/Note/NoteContext";

// Sample data - Using Kieran's pubkey for examples
const SAMPLE_HEX_PUBKEY = bech32ToHex(KieranPubKey);
// Additional sample pubkeys from DeveloperAccounts
const SAMPLE_PUBKEY_2 = "4523be58d395b1b196a9b8c82b038b6895cb02b683d0c253a955068dba1facd0"; // Martti
const SAMPLE_PUBKEY_3 = "7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194"; // verbiricha

const SAMPLE_INVOICE =
  "lnbc210n1p50yk0qpp5kdtjslgczmphsugxskskhf4l6090gjqs3v26zk38gk3yfqc2h5jqdqcv4uxzmtsd3jjq6twwehkjcm9cqzzsxqyz5vqsp5c0pv9plkvx5e9ddcm6rkvycvt4mc2540awcl4kyzl0khhkqn9tgs9qxpqysgqw5h7plfn0m26vxggs0jhakcnm45k3044q5wv5yrx8yeljtqdnmr439pzr397uqxef4eljm76ek0m2z9nm3kjustf7zkpxm78t8z2p5cqkds20e";
const SAMPLE_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const SAMPLE_SPOTIFY_URL = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT";
const SAMPLE_APPLE_MUSIC_URL = "https://music.apple.com/us/album/example";
const SAMPLE_TIDAL_URL = "https://tidal.com/browse/track/111398735";
const SAMPLE_SOUNDCLOUD_URL = "https://soundcloud.com/djgrooveteck/sidepiece-walking-on-a-dream-vip";
const SAMPLE_WAVLAKE_URL = "https://wavlake.com/track/1079f9b0-e60a-4eba-87c4-c380aa795786";
const SAMPLE_MIXCLOUD_URL = "https://www.mixcloud.com/johndigweed/transitions-with-john-digweed-and-adam-freeland";
const SAMPLE_NOSTR_NESTS_URL = "https://nostrnests.com/example";
const SAMPLE_CASHU_TOKEN =
  "cashuAeyJ0b2tlbiI6W3sibWludCI6Imh0dHBzOi8vbWludC5taW5pYml0cy5jYXNoL0JpdGNvaW4iLCJwcm9vZnMiOlt7ImFtb3VudCI6MTYsIkMiOiIwMjFlODY2YzMzNjYzNzQzMjMyMWYwNjRjYzQ3NTdlMTRjZmE0NDJlYjhlMTVmMjUwN2ExNmJhOGMyOGFmMDg0NWEiLCJpZCI6IjltbGZkNXZDemdHbCIsInNlY3JldCI6ImFlZjhhYmJkYzQzOTI4NWM3MDI1YzI3YzU5NjE1Y2Q1YjM0ODU0YjJmNmJlMzFlMDdlNzQ5YzQ5OWU0NzQ1MjIifSx7ImFtb3VudCI6NCwiQyI6IjAzOTMwYzFmNjg5NDY1ZTQwMWVmODU0YTg5MzdmYzJmMWIyNTRhOGYxNWIxZmU2ZmMyNDc2ODZmYTQyM2E4NmQ4ZCIsImlkIjoiOW1sZmQ1dkN6Z0dsIiwic2VjcmV0IjoiZGY3YmM1ZGFiNGM1YzUzZmQwNjgwNDRjMGYxM2NkNzA2MmNhYTBhOGY4NDA3ZDU4NGFkZTg0ZWQ1NTBhMTdkNSJ9LHsiYW1vdW50Ijo0LCJDIjoiMDI1ZWFhODE2ZGY3ZWZlYmY2MTZjYTM3NTg0ODIxMmE3OWFmZmEzNjY0NzA1ZGNhY2I3Y2FkMDY0ODgyYTU2NmRmIiwiaWQiOiI5bWxmZDV2Q3pnR2wiLCJzZWNyZXQiOiJiZTAwNGY5ZjYxOTk1NzY3NDliN2Q4YmQzMDJhYTZiYjlmYzJjOTFlYTAyZmVmZDk5MDZjOWE4MmJiY2E5ZDg0In0seyJhbW91bnQiOjEsIkMiOiIwMmRiZjg0YmYzNjg1ZTQ2MDUxMTM0MjMzNzJkZmE5MGY4OGE2YmU1ODEzOWIzMmM5MTc4MmY2ZWFjMWFkMmEzZjUiLCJpZCI6IjltbGZkNXZDemdHbCIsInNlY3JldCI6IjczMmNiYTVjYzFkNTQwOTdhMzM3NWJlNDg2NGM2OTUxNDZlNTZiOTJlOWU3MjU3ZmZiMWZjY2NhN2ZjZjA0N2YifV19XX0";

// Sample events for complex components
const SAMPLE_POLL_EVENT = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 6969,
  tags: [
    ["poll_option", "0", "Option A"],
    ["poll_option", "1", "Option B"],
    ["poll_option", "2", "Option C"],
  ],
  content: "What's your favorite?",
  sig: "",
} as NostrEvent;
SAMPLE_POLL_EVENT.id = EventExt.createId(SAMPLE_POLL_EVENT);

const SAMPLE_LONG_FORM_EVENT = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 30023,
  tags: [
    ["d", "example"],
    ["title", "Component Debug Guide"],
    ["summary", "A comprehensive guide to debugging components"],
    ["t", "development"],
  ],
  content:
    "# Introduction\n\nThis is a sample long-form article to demonstrate the LongFormText component. It includes **markdown** formatting, _italic text_, and more.\n\n## Features\n\n- Read time calculation\n- Text-to-speech\n- Truncation support",
  sig: "",
} as NostrEvent;
SAMPLE_LONG_FORM_EVENT.id = EventExt.createId(SAMPLE_LONG_FORM_EVENT);

const SAMPLE_ZAP_GOAL_EVENT = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 9041,
  tags: [["amount", "100000"]],
  content: "Help support development!",
  sig: "",
} as NostrEvent;
SAMPLE_ZAP_GOAL_EVENT.id = EventExt.createId(SAMPLE_ZAP_GOAL_EVENT);

// Sample text note (kind 1)
const SAMPLE_TEXT_NOTE = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 1,
  tags: [],
  content:
    "This is a sample text note (kind 1) with some content. It can include #hashtags and links like https://snort.social",
  sig: "",
} as NostrEvent;
SAMPLE_TEXT_NOTE.id = EventExt.createId(SAMPLE_TEXT_NOTE);

// Sample note with gallery (1 image)
const SAMPLE_GALLERY_1_NOTE = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 1,
  tags: [],
  content: "Single image gallery\n\nhttps://picsum.photos/800/600.jpg",
  sig: "",
} as NostrEvent;
SAMPLE_GALLERY_1_NOTE.id = EventExt.createId(SAMPLE_GALLERY_1_NOTE);

// Sample note with gallery (2 images)
const SAMPLE_GALLERY_2_NOTE = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 1,
  tags: [],
  content: "Two images side by side\n\nhttps://picsum.photos/400/400.jpg\nhttps://picsum.photos/400/400.jpg",
  sig: "",
} as NostrEvent;
SAMPLE_GALLERY_2_NOTE.id = EventExt.createId(SAMPLE_GALLERY_2_NOTE);

// Sample note with gallery (3 images)
const SAMPLE_GALLERY_3_NOTE = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 1,
  tags: [],
  content:
    "Three images - one big, two small\n\nhttps://picsum.photos/500/500.jpg\nhttps://picsum.photos/300/300.jpg\nhttps://picsum.photos/300/300.jpg",
  sig: "",
} as NostrEvent;
SAMPLE_GALLERY_3_NOTE.id = EventExt.createId(SAMPLE_GALLERY_3_NOTE);

// Sample note with gallery (4 images)
const SAMPLE_GALLERY_4_NOTE = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 1,
  tags: [],
  content:
    "Four images in a grid\n\nhttps://picsum.photos/400/300.jpg\nhttps://picsum.photos/400/300.jpg\nhttps://picsum.photos/400/300.jpg\nhttps://picsum.photos/400/300.jpg",
  sig: "",
} as NostrEvent;
SAMPLE_GALLERY_4_NOTE.id = EventExt.createId(SAMPLE_GALLERY_4_NOTE);

// Sample note with gallery (5 images)
const SAMPLE_GALLERY_5_NOTE = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 1,
  tags: [],
  content:
    "Five images mixed layout\n\nhttps://picsum.photos/450/300.jpg\nhttps://picsum.photos/450/300.jpg\nhttps://picsum.photos/450/300.jpg\nhttps://picsum.photos/250/300.jpg\nhttps://picsum.photos/250/300.jpg",
  sig: "",
} as NostrEvent;
SAMPLE_GALLERY_5_NOTE.id = EventExt.createId(SAMPLE_GALLERY_5_NOTE);

// Sample note with gallery (6 images)
const SAMPLE_GALLERY_6_NOTE = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 1,
  tags: [],
  content:
    "Six images complex layout\n\nhttps://picsum.photos/500/500.jpg\nhttps://picsum.photos/250/250.jpg\nhttps://picsum.photos/250/250.jpg\nhttps://picsum.photos/500/500.jpg\nhttps://picsum.photos/250/250.jpg\nhttps://picsum.photos/250/250.jpg",
  sig: "",
} as NostrEvent;
SAMPLE_GALLERY_6_NOTE.id = EventExt.createId(SAMPLE_GALLERY_6_NOTE);

// Sample repost (kind 6)
const SAMPLE_REPOST = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 6,
  tags: [
    ["e", SAMPLE_TEXT_NOTE.id, "", "mention"],
    ["p", SAMPLE_PUBKEY_2],
  ],
  content: JSON.stringify(SAMPLE_TEXT_NOTE),
  sig: "",
} as NostrEvent;
SAMPLE_REPOST.id = EventExt.createId(SAMPLE_REPOST);

// Sample reply (kind 1 with reply tags)
const SAMPLE_REPLY = {
  id: "",
  pubkey: SAMPLE_HEX_PUBKEY,
  created_at: unixNow(),
  kind: 1,
  tags: [
    ["e", SAMPLE_TEXT_NOTE.id, "", "reply"],
    ["p", SAMPLE_HEX_PUBKEY],
  ],
  content: "This is a reply to another note!",
  sig: "",
} as NostrEvent;
SAMPLE_REPLY.id = EventExt.createId(SAMPLE_REPLY);

const SAMPLE_LIVE_STREAM_EVENT = {
  kind: 30311,
  id: "316e22791b576ef66a6f0325cbd2a81c5242dc096ba09e9e6a264cdabdf07cfa",
  pubkey: "cf45a6ba1363ad7ed213a078e710d24115ae721c9b47bd1ebf4458eaefb4c2a5",
  created_at: 1760717551,
  tags: [
    ["d", "537a365c-f1ec-44ac-af10-22d14a7319fb"],
    ["status", "live"],
    ["starts", "1739464332"],
    ["title", "NoGood Radio"],
    [
      "summary",
      "NoGood Radio is a 24/7 pirate radio station running on scrap parts and broadcasting from a basement somewhere.",
    ],
    ["image", "https://blossom.nogood.studio/6d5bb489e87c2f2db2a0fa61fd2bfca9f6d4f50e05b7caf1784644886c0e4ff6"],
    ["thumb", "https://api-core.zap.stream/537a365c-f1ec-44ac-af10-22d14a7319fb/thumb.webp?n=1760717527"],
    ["goal", "854bac46f638e93f9cdb6aa0f415cbcfb8041e5383571aa5c538ba354145e584"],
    ["t", "Radio"],
    ["t", "24/7"],
    ["t", "internal:music"],
    ["current_participants", "7"],
    [
      "alt",
      "Watch live on https://zap.stream/naddr1qqjr2vehvyenvdtr94nrzetr956rgctr94skvvfs95eryep3x3snwve389nxyq3qeaz6dwsnvwkha5sn5puwwyxjgy26uusundrm684lg3vw4ma5c2jsxpqqqpmxwrqz3al",
    ],
    ["p", "55f04590674f3648f4cdc9dc8ce32da2a282074cd0b020596ee033d12d385185", "", "host"],
    ["service", "https://api-core.zap.stream/api/v1"],
    ["streaming", "https://api-core.zap.stream/537a365c-f1ec-44ac-af10-22d14a7319fb/hls/live.m3u8"],
  ],
  content: "",
  sig: "6674b3d183da4c6208908f0e1118dee5682f5f635fd3b21141563a5986635d2f687d532686f4cf55bb2256cde561f3bb8c660a9d805c95d13443c8bf7bb2b75f",
};

const ExampleMagnetLink =
  "magnet:?xt=urn:btih:9065a82c1bb9e8e69ad14044ee4a4aba35cb17ea&dn=nostr.band%20snapshot&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker-udp.gbitt.info%3A80%2Fannounce&tr=https%3A%2F%2Ftracker.tamersunion.org%3A443%2Fannounce&tr=udp%3A%2F%2Ftracker2.dler.org%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker1.bt.moack.co.kr%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.theoks.net%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.ccp.ovh%3A6969%2Fannounce";

const TextExample = `Hello Nostr! This is a test message with #nostr and https://example.com 
https://github.com/v0l/snort
blossom:ba9037d243fc6fbf23ae6b6af36cd5235fddc59fbea5cc7c0f590966fba102db.jpg?xs=nostr.download&xs=example.com&as=63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed&as=266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5&sz=324265
${ExampleMagnetLink}
nostr:${NostrLink.fromEvent(SAMPLE_LIVE_STREAM_EVENT).encode()}
${SAMPLE_CASHU_TOKEN}
${SAMPLE_INVOICE}
`;

export default function ComponentDebugPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<Tab>({ value: 0, text: "Tab 1" });
  const [collapsed, setCollapsed] = useState(true);
  const [toggleState, setToggleState] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  const tabs: Tab[] = [
    { value: 0, text: "Tab 1" },
    { value: 1, text: "Tab 2" },
    { value: 2, text: "Tab 3" },
    { value: 3, text: "Disabled", disabled: true },
  ];

  const sampleNostrLink = new NostrLink(NostrPrefix.Profile, SAMPLE_HEX_PUBKEY);

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    setTheme(!isLightMode ? "light" : "dark");
  };

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Component Debug Page</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm">Dark</span>
          <ToggleSwitch size={32} onClick={toggleTheme} className={isLightMode ? "active" : ""} />
          <span className="text-sm">Light</span>
        </div>
      </div>

      {/* Buttons Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Buttons</h2>
        <div className="space-y-4">
          <div className="flex justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-2">
              <span className="text-sm ">AsyncButton</span>
              <AsyncButton onClick={async () => new Promise(resolve => setTimeout(resolve, 1000))}>
                Click Me (Async)
              </AsyncButton>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">AsyncButton (Disabled)</span>
              <AsyncButton disabled onClick={async () => {}}>
                Disabled
              </AsyncButton>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">BackButton</span>
              <BackButton />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">CloseButton</span>
              <CloseButton />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">IconButton</span>
              <IconButton icon={{ name: "heart" }} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">NavLink</span>
              <NavLink to="/">Home</NavLink>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">LogoutButton</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </section>

      {/* Icons Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Icons</h2>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <Icon name="heart" size={24} />
            <span className="text-sm ">heart</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="repost" size={24} />
            <span className="text-sm ">repost</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="reply" size={24} />
            <span className="text-sm ">reply</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="zap-filled" size={24} />
            <span className="text-sm ">zap</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="bookmark" size={24} />
            <span className="text-sm ">bookmark</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon name="dots" size={24} />
            <span className="text-sm ">dots</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Spinner />
            <span className="text-sm ">spinner</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Alby size={24} />
            <span className="text-sm ">alby</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Cashu size={24} />
            <span className="text-sm ">cashu</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Nostrich height={24} width={24} />
            <span className="text-sm ">nostrich</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <BlueWallet width={24} height={24} />
            <span className="text-sm ">bluewallet</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ECash width={24} height={24} />
            <span className="text-sm ">ecash</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <NWC width={24} height={24} />
            <span className="text-sm ">nwc</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ToggleSwitch
              size={24}
              onClick={() => setToggleState(!toggleState)}
              className={toggleState ? "active" : ""}
            />
            <span className="text-sm ">toggle</span>
          </div>
        </div>
      </section>

      {/* User Components Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">User Components</h2>
        <div className="space-y-6">
          <div className="flex justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-sm ">Avatar (size: 48)</span>
              <Avatar pubkey={SAMPLE_HEX_PUBKEY} size={48} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">ProfileImage</span>
              <ProfileImage pubkey={SAMPLE_HEX_PUBKEY} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">AvatarGroup</span>
              <AvatarGroup ids={[SAMPLE_HEX_PUBKEY, SAMPLE_PUBKEY_2, SAMPLE_PUBKEY_3]} size={30} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">Username:</span>
              <Username pubkey={SAMPLE_HEX_PUBKEY} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">DisplayName:</span>
              <DisplayName pubkey={SAMPLE_HEX_PUBKEY} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">ProfileLink:</span>
              <ProfileLink pubkey={SAMPLE_HEX_PUBKEY}>View Profile</ProfileLink>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">Nip05:</span>
              <Nip05 nip05="user@domain.com" pubkey={SAMPLE_HEX_PUBKEY} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">FollowButton:</span>
              <FollowButton pubkey={SAMPLE_HEX_PUBKEY} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">MuteButton:</span>
              <MuteButton pubkey={SAMPLE_HEX_PUBKEY} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">FollowsYou (true):</span>
              <FollowsYou followsMe={true} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">FollowsYou (false):</span>
              <FollowsYou followsMe={false} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">FollowDistanceIndicator:</span>
              <FollowDistanceIndicator pubkey={SAMPLE_HEX_PUBKEY} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">BadgeList:</span>
              <BadgeList badges={[]} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">UserWebsiteLink:</span>
              <UserWebsiteLink user={{ website: "https://snort.social" } as any} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm  w-48">FollowedBy:</span>
              <FollowedBy pubkey={SAMPLE_HEX_PUBKEY} />
            </div>
          </div>
        </div>
      </section>

      {/* Text Components Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Text Components</h2>
        <div className="space-y-4">
          <div>
            <span className="mb-2">Text with content:</span>
            <div className="layer-1">
              <Text id={sha256(TextExample)} depth={0} content={TextExample} tags={[]} creator={SAMPLE_HEX_PUBKEY} />
            </div>
          </div>

          <div>
            <span className="mb-2">HighlightedText:</span>
            <div className="bg-neutral-800 light:bg-neutral-200 p-4 rounded">
              <HighlightedText
                content="This is some highlighted text to demonstrate the component"
                textToHighlight="highlighted text"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Embed Components Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Embed Components</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Embeds</h3>
            <div className="flex gap-4 flex-wrap justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-sm ">Hashtag:</span>
                <Hashtag tag="nostr" />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm ">Hashtag (bitcoin):</span>
                <Hashtag tag="bitcoin" />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm ">Mention:</span>
                <Mention link={sampleNostrLink} />
              </div>
            </div>

            <div className="flex-1">
              <span className="text-sm mb-4">Invoice:</span>
              <Invoice invoice={SAMPLE_INVOICE} />
            </div>

            <div className="flex-1">
              <span className="text-sm mb-4">MagnetLink:</span>
              <MagnetLink magnet={magnetURIDecode(ExampleMagnetLink)!} />
            </div>

            <div className="flex-1">
              <span className="text-sm mb-4">CashuNuts:</span>
              <CashuNuts token={SAMPLE_CASHU_TOKEN} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Media Embeds</h3>
            <div className="space-y-4">
              <div>
                <span className="mb-2">YoutubeEmbed:</span>
                <YoutubeEmbed link={SAMPLE_YOUTUBE_URL} />
              </div>

              <div>
                <span className="mb-2">SpotifyEmbed:</span>
                <SpotifyEmbed link={SAMPLE_SPOTIFY_URL} />
              </div>

              <div>
                <span className="mb-2">AppleMusicEmbed:</span>
                <AppleMusicEmbed link={SAMPLE_APPLE_MUSIC_URL} />
              </div>

              <div>
                <span className="mb-2">TwitchEmbed:</span>
                <TwitchEmbed link={"https://twitch.tv/asmongold247"} />
              </div>

              <div>
                <span className="mb-2">TidalEmbed:</span>
                <TidalEmbed link={SAMPLE_TIDAL_URL} />
              </div>

              <div>
                <span className="mb-2">SoundCloudEmbed:</span>
                <SoundCloudEmbed link={SAMPLE_SOUNDCLOUD_URL} />
              </div>

              <div>
                <span className="mb-2">WavlakeEmbed:</span>
                <WavlakeEmbed link={SAMPLE_WAVLAKE_URL} />
              </div>

              <div>
                <span className="mb-2">MixCloudEmbed:</span>
                <MixCloudEmbed link={SAMPLE_MIXCLOUD_URL} />
              </div>

              <div>
                <span className="mb-2">NostrNestsEmbed:</span>
                <NostrNestsEmbed link={SAMPLE_NOSTR_NESTS_URL} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Components Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Event Components</h2>
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-sm ">NoteTime (relative):</span>
              <NoteTime from={(unixNow() - 3600) * 1000} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">NoteTime (2 days ago):</span>
              <NoteTime from={(unixNow() - 172800) * 1000} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">ZapButton:</span>
              <ZapButton pubkey={SAMPLE_HEX_PUBKEY} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm ">ClientTag:</span>
              <ClientTag
                ev={
                  {
                    tags: [EventBuilder.ClientTag],
                  } as any
                }
              />
            </div>
          </div>

          <div>
            <span className="mb-2">KindName (various event kinds):</span>
            <div className="flex justify-between">
              {[1, 6, 7, 9735, 30023].map(k => (
                <div>
                  {k}: <KindName kind={k} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2">NoteHeader:</span>
            <div className="w-full">
              <NoteProvider ev={SAMPLE_POLL_EVENT}>
                <NoteHeader options={{ showTime: true, showContextMenu: true }} />
              </NoteProvider>
            </div>
          </div>

          <div>
            <span className="mb-2">NoteReaction:</span>
            <div className="flex gap-2">
              <span className="text-2xl">🚀</span>
              <span className="text-2xl">❤️</span>
              <span className="text-2xl">🔥</span>
              <span className="text-2xl">👍</span>
            </div>
          </div>

          <div>
            <span className="mb-2">ZapAmountLabel:</span>
            <ZapAmountLabel n={21000} />
          </div>

          <div>
            <span className="mb-2">ZapsSummary:</span>
            <ZapsSummary zaps={[]} onClick={() => {}} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Complex Event Components</h3>

          <div>
            <span className="mb-2">Poll (Interactive voting):</span>
            <div className="max-w-2xl border rounded p-4">
              <Poll ev={SAMPLE_POLL_EVENT} zaps={[]} />
            </div>
          </div>

          <div>
            <span className="mb-2">ZapGoal (Fundraising goal):</span>
            <div className="max-w-2xl">
              <ZapGoal ev={SAMPLE_ZAP_GOAL_EVENT} />
            </div>
          </div>

          <div>
            <span className="mb-2">LongFormText (Article preview):</span>
            <div className="max-w-2xl border rounded">
              <LongFormText ev={SAMPLE_LONG_FORM_EVENT} isPreview={false} truncate={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Note Component with Different Event Types */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Note Component (Different Event Types)</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Text Note (Kind 1)</h3>
            <Note data={SAMPLE_TEXT_NOTE} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Note with Image Gallery - 1 Image</h3>
            <Note data={SAMPLE_GALLERY_1_NOTE} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Note with Image Gallery - 2 Images (Side by Side)</h3>
            <Note data={SAMPLE_GALLERY_2_NOTE} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Note with Image Gallery - 3 Images (1 Big + 2 Small)</h3>
            <Note data={SAMPLE_GALLERY_3_NOTE} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Note with Image Gallery - 4 Images (Grid)</h3>
            <Note data={SAMPLE_GALLERY_4_NOTE} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Note with Image Gallery - 5 Images (Mixed Layout)</h3>
            <Note data={SAMPLE_GALLERY_5_NOTE} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Note with Image Gallery - 6 Images (Complex Layout)</h3>
            <Note data={SAMPLE_GALLERY_6_NOTE} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Reply Note (Kind 1 with reply tags)</h3>
            <Note data={SAMPLE_REPLY} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Repost (Kind 6)</h3>
            <Note data={SAMPLE_REPOST} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Poll (Kind 6969)</h3>
            <Note data={SAMPLE_POLL_EVENT} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Long Form Article (Kind 30023)</h3>
            <Note data={SAMPLE_LONG_FORM_EVENT} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Zap Goal (Kind 9041)</h3>
            <Note data={SAMPLE_ZAP_GOAL_EVENT} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Live Stream (Kind 30311)</h3>
            <Note data={SAMPLE_LIVE_STREAM_EVENT as any} />
          </div>
        </div>
      </section>

      {/* Utility Components Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Utility Components</h2>
        <div className="space-y-4">
          <div>
            <span className="mb-2">Copy:</span>
            <Copy text="Sample text to copy" />
          </div>

          <div>
            <span className="mb-2">QrCode:</span>
            <QrCode data="https://example.com" />
          </div>

          <div>
            <span className="mb-2">ProxyImg:</span>
            <ProxyImg src="https://picsum.photos/200" size={200} />
          </div>

          <div>
            <span className="mb-2">Progress (65%):</span>
            <Progress value={0.65} />
          </div>

          <div>
            <span className="mb-2">Progress (100%):</span>
            <Progress value={1.0} />
          </div>

          <div>
            <span className="mb-2">Collapsed:</span>
            <Collapsed text="Click to expand" collapsed={collapsed} setCollapsed={setCollapsed}>
              <div className="p-4 bg-neutral-800 rounded">This is the expanded content that was hidden before!</div>
            </Collapsed>
          </div>

          <div>
            <span className="mb-2">CollapsedSection:</span>
            <CollapsedSection title="Expandable Section" startClosed={true}>
              <div className="p-4 bg-neutral-800 rounded mt-2">This is content inside a collapsible section.</div>
            </CollapsedSection>
          </div>

          <div>
            <span className="mb-2">WarningNotice:</span>
            <WarningNotice>This is a warning message</WarningNotice>
          </div>

          <div>
            <span className="mb-2">TabSelectors:</span>
            <TabSelectors tabs={tabs} tab={selectedTab} setTab={setSelectedTab} />
          </div>

          <div>
            <span className="mb-2">SearchBox (no props needed):</span>
            <div className="text-sm text-gray-400">SearchBox is a self-contained component with its own state</div>
          </div>

          <div>
            <span className="mb-2">PageSpinner:</span>
            <div className="h-20 relative">
              <PageSpinner />
            </div>
          </div>

          <div>
            <span className="mb-2">LoadMore:</span>
            <LoadMore onLoadMore={() => console.log("Load more clicked")} shouldLoadMore={true} />
          </div>
        </div>
      </section>

      {/* Specialized Components Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Specialized Components</h2>
        <div className="space-y-4">
          <div>
            <span className="mb-2 text-lg">NoteToSelf:</span>
            <NoteToSelf />
          </div>

          <div>
            <span className="mb-2 text-xl">TrendingHashtags:</span>
            <TrendingHashtags count={1} />
          </div>

          <div>
            <span className="mb-2 text-xl">TrendingUsers:</span>
            <TrendingUsers count={1} />
          </div>

          <div>
            <span className="mb-2 text-xl">TrendingPosts:</span>
            <TrendingPosts count={1} small={true} />
          </div>

          <div>
            <span className="mb-2 text-xl">SuggestedProfiles:</span>
            <SuggestedProfiles />
          </div>

          <div>
            <span className="mb-2 text-xl">PaidRelayLabel:</span>
            <div className="flex gap-2">
              <PaidRelayLabel info={{ limitation: { payment_required: true } } as any} />
              <PaidRelayLabel info={{ limitation: { payment_required: false } } as any} />
            </div>
          </div>

          <div>
            <span className="mb-2 text-xl">UptimeLabel:</span>
            <UptimeLabel avgPing={95.5} />
          </div>

          <div>
            <span className="mb-2 text-xl">LiveStream Components:</span>
            <div className="text-sm">
              <LiveEvent ev={SAMPLE_LIVE_STREAM_EVENT} />
            </div>
          </div>
        </div>
      </section>

      {/* Modal Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Modal</h2>
        <div>
          <AsyncButton onClick={async () => setShowModal(true)}>Open Modal</AsyncButton>
          {showModal && (
            <Modal id="debug-modal" onClose={() => setShowModal(false)}>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4">Sample Modal</h3>
                <p className="mb-4">This is a modal dialog component</p>
                <AsyncButton onClick={async () => setShowModal(false)}>Close</AsyncButton>
              </div>
            </Modal>
          )}
        </div>
      </section>

      {/* States Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Component States</h2>
        <div className="space-y-4">
          <div className="bg-neutral-800 p-4 rounded">
            <h3>Button States</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <AsyncButton onClick={async () => {}}>Normal</AsyncButton>
              <AsyncButton disabled onClick={async () => {}}>
                Disabled
              </AsyncButton>
              <AsyncButton onClick={async () => new Promise(resolve => setTimeout(resolve, 50000))}>
                Long Task
              </AsyncButton>
            </div>
          </div>
        </div>
      </section>

      {/* Toaster */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Toaster</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <AsyncButton
            onClick={async () => {
              Toastore.push({ element: <div className="text-xl">Example Notification</div> });
            }}>
            Example Notification
          </AsyncButton>
        </div>
        <Toaster />
      </section>

      {/* Markdown Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Markdown</h2>
        <div className="space-y-6">
          <div className="light:bg-neutral-200 bg-neutral-800 p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Complete Markdown Example</h3>
            <Markdown
              content={`# Heading 1
This is a comprehensive markdown example demonstrating all supported markdown features.

## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

---

## Text Formatting

This is **bold text** using double asterisks.

This is *italic text* using single asterisks or _underscores_.

This is ***bold and italic*** using triple asterisks.

This is ~~strikethrough text~~ using double tildes.

This is \`inline code\` using backticks.

---

## Links

Here's a regular link: [Snort Social](https://snort.social)

Here's a link with title: [Nostr Protocol](https://nostr.com "Nostr Homepage")

Autolinked URL: https://github.com/nostr-protocol/nips

---

## Lists

### Unordered Lists

- First item
- Second item
- Third item
  - Nested item 1
  - Nested item 2
    - Deeply nested item
- Fourth item

### Ordered Lists

1. First item
2. Second item
3. Third item
   1. Nested item 1
   2. Nested item 2
4. Fourth item

### Mixed Lists

1. First ordered item
   - Nested unordered item
   - Another nested item
2. Second ordered item
   1. Nested ordered item
   2. Another nested ordered

---

## Blockquotes

> This is a blockquote.
> It can span multiple lines.

> Blockquotes can also be nested:
>> This is a nested blockquote.
>>> And even deeper!

> You can also use **markdown** inside blockquotes:
> - Lists work too
> - Another item
>
> And paragraphs!

---

## Code Blocks

Inline code: \`const x = 42;\`

Multi-line code block:

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return true;
}

const result = greet("Nostr");
\`\`\`

Another code block without language:

\`\`\`
plain text code block
with multiple lines
no syntax highlighting
\`\`\`

---

## Horizontal Rules

You can create horizontal rules in multiple ways:

---

***

___

---

## Images

![Placeholder Image](https://picsum.photos/600/300)

---

## Tables (if supported)

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
| Cell 7   | Cell 8   | Cell 9   |

---

## Task Lists (if supported)

- [x] Completed task
- [x] Another completed task
- [ ] Incomplete task
- [ ] Another incomplete task

---

## Mixed Content Example

Here's a paragraph with **bold**, *italic*, ~~strikethrough~~, and \`code\` all together.

1. Start with an ordered list
2. Add some **formatting**
   - Mix with unordered lists
   - And [links](https://snort.social)
3. Continue the ordered list

> Then add a blockquote with *emphasis*

And finish with \`inline code\` and a link: https://example.com

---

## Special Characters & Escaping

You can escape special characters: \\* \\_ \\# \\[ \\]

Markdown symbols: * # - + [ ] ( ) { }

---

## Long Paragraphs

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

---

## Emphasis Combinations

**Bold text with *italic inside* it**

*Italic text with **bold inside** it*

***All bold and italic***

**Bold with \`code\` inside**

*Italic with [link](https://example.com) inside*

---

## Line Breaks

This is line one.
This is line two (with two spaces before line break).

This is line three (new paragraph).

---

## Conclusion

This example covers all major markdown features including:
- Headings (all 6 levels)
- Text formatting (bold, italic, strikethrough)
- Links and autolinks
- Ordered and unordered lists
- Nested lists
- Blockquotes (including nested)
- Code blocks and inline code
- Horizontal rules
- Images
- Tables
- Mixed content
- Special characters
- And more!
`}
            />
          </div>
        </div>
      </section>

      {/* Form Inputs Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Form Inputs</h2>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Text Input</label>
              <input type="text" placeholder="Enter text..." className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Input</label>
              <input type="email" placeholder="email@example.com" className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Password Input</label>
              <input type="password" placeholder="Enter password..." className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Number Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Number Input</label>
              <input type="number" placeholder="0" min="0" max="100" className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Tel Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Tel Input</label>
              <input type="tel" placeholder="+1 (555) 123-4567" className="w-full px-3 py-2 border rounded" />
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium mb-2">URL Input</label>
              <input type="url" placeholder="https://example.com" className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Search Input</label>
              <input type="search" placeholder="Search..." className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Date Input</label>
              <input type="date" className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Time Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Time Input</label>
              <input type="time" className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Datetime-local Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Datetime-local Input</label>
              <input type="datetime-local" className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Month Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Month Input</label>
              <input type="month" className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Week Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Week Input</label>
              <input type="week" className="w-full px-3 py-2 border rounded" />
            </div>

            {/* Color Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Color Input</label>
              <input type="color" defaultValue="#ff6b00" className="w-full h-10 border rounded cursor-pointer" />
            </div>

            {/* Range Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Range Input</label>
              <input type="range" min="0" max="100" defaultValue="50" className="w-full" />
            </div>

            {/* File Input */}
            <div>
              <label className="block text-sm font-medium mb-2">File Input</label>
              <input type="file" className="w-full px-3 py-2 border rounded" />
            </div>

            {/* File Input (Multiple) */}
            <div>
              <label className="block text-sm font-medium mb-2">File Input (Multiple)</label>
              <input type="file" multiple className="w-full px-3 py-2 border rounded" />
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-sm font-medium mb-2">Textarea</label>
            <textarea
              placeholder="Enter multiple lines of text..."
              rows={4}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {/* Select */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Select</label>
              <select className="w-full px-3 py-2 border rounded">
                <option value="">Choose an option...</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
                <option value="3">Option 3</option>
              </select>
            </div>

            {/* Multiple Select */}
            <div>
              <label className="block text-sm font-medium mb-2">Multiple Select</label>
              <select multiple size={4} className="w-full px-3 py-2 border rounded">
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
                <option value="3">Option 3</option>
                <option value="4">Option 4</option>
              </select>
            </div>
          </div>

          {/* Checkboxes */}
          <div>
            <label className="block text-sm font-medium mb-2">Checkboxes</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Checkbox 1</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Checkbox 2 (checked)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" disabled className="w-4 h-4" />
                <span>Checkbox 3 (disabled)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked disabled className="w-4 h-4" />
                <span>Checkbox 4 (checked & disabled)</span>
              </label>
            </div>
          </div>

          {/* Radio Buttons */}
          <div>
            <label className="block text-sm font-medium mb-2">Radio Buttons</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="radio" name="radio-group" value="1" className="w-4 h-4" />
                <span>Radio Option 1</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="radio-group" value="2" defaultChecked className="w-4 h-4" />
                <span>Radio Option 2 (selected)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="radio-group" value="3" className="w-4 h-4" />
                <span>Radio Option 3</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="radio-disabled" value="4" disabled className="w-4 h-4" />
                <span>Radio Option 4 (disabled)</span>
              </label>
            </div>
          </div>

          {/* Input States */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Input States</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-font-color">Normal Input</label>
                <input type="text" placeholder="Normal state" className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-font-color">Disabled Input</label>
                <input type="text" placeholder="Disabled state" disabled className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-font-color">Readonly Input</label>
                <input type="text" value="Read-only value" readOnly className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-font-color">Required Input</label>
                <input type="text" placeholder="Required field" required className="w-full px-3 py-2 border rounded" />
              </div>
            </div>
          </div>

          {/* Fieldset and Legend */}
          <div>
            <fieldset className="border rounded p-4">
              <legend className="px-2 font-semibold text-font-color">Fieldset with Legend</legend>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1 text-font-color">Field 1</label>
                  <input type="text" placeholder="First field" className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-font-color">Field 2</label>
                  <input type="text" placeholder="Second field" className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
            </fieldset>
          </div>

          {/* Datalist */}
          <div>
            <label className="block text-sm font-medium mb-2">Input with Datalist</label>
            <input
              type="text"
              list="browsers"
              placeholder="Choose or type a browser..."
              className="w-full px-3 py-2 border rounded"
            />
            <datalist id="browsers">
              <option value="Chrome" />
              <option value="Firefox" />
              <option value="Safari" />
              <option value="Edge" />
              <option value="Opera" />
            </datalist>
          </div>

          {/* Button types */}
          <div>
            <h3 className="text-lg font-semibold mb-3">HTML Button Types</h3>
            <div className="flex gap-3 flex-wrap">
              <button type="button" className="px-4 py-2 border rounded">
                Button
              </button>
              <button type="submit" className="px-4 py-2 border rounded">
                Submit
              </button>
              <button type="reset" className="px-4 py-2 border rounded">
                Reset
              </button>
              <button type="button" disabled className="px-4 py-2 border rounded">
                Disabled
              </button>
              <input type="button" value="Input Button" className="px-4 py-2 border rounded cursor-pointer" />
              <input type="submit" value="Input Submit" className="px-4 py-2 border rounded cursor-pointer" />
              <input type="reset" value="Input Reset" className="px-4 py-2 border rounded cursor-pointer" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
