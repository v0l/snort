// Main settings pages
export { default as AccountsPage } from "./Accounts";
export { CacheSettings } from "./Cache";
export { default as ExportKeys } from "./Keys";
export { default as MediaSettingsPage } from "./media-settings";
export { default as Menu } from "./Menu/Menu";
export { default as ModerationSettings } from "./Moderation";
export { default as Notifications } from "./Notifications";
export { default as Preferences } from "./Preferences";
export { default as Profile } from "./Profile";
export { ReferralsPage } from "./Referrals";
export { default as RelayInfo } from "./RelayInfo";
export { default as Relay } from "./Relays";

// Tools pages
export { FollowsRelayHealth, PruneFollowList, SyncAccountTool, ToolsPage } from "./tools";

// Wallet pages
export { WalletSettings, AlbyOAuth, ConnectLNDHub, ConnectNostrWallet } from "./wallet";

// Handle pages
export { ListHandles, ManageHandleIndex } from "./handle";
