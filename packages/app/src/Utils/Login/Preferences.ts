import type { ImgProxySettings } from "@/Hooks/useImgProxy";
import type { RootTabRoutePath } from "@/Pages/Root/RootTabRoutes";
import { DefaultImgProxy } from "@/Utils/Const";

export interface UserPreferences {
  /**
   * User selected language
   */
  language?: string;

  /**
   * Enable reactions / reposts / zaps
   */
  enableReactions: boolean;

  /**
   * Reaction emoji
   */
  reactionEmoji: string;

  /**
   * Automatically load media (show link only) (bandwidth/privacy)
   */
  autoLoadMedia: "none" | "follows-only" | "all";

  /**
   * Select between light/dark theme
   */
  theme: "system" | "light" | "dark";

  /**
   * Ask for confirmation when reposting notes
   */
  confirmReposts: boolean;

  /**
   * Automatically show the latests notes
   */
  autoShowLatest: boolean;

  /**
   * Show debugging menus to help diagnose issues
   */
  showDebugMenus: boolean;

  /**
   * Use imgproxy to optimize images
   */
  imgProxyConfig?: ImgProxySettings;

  /**
   * Default page to select on load
   */
  defaultRootTab: RootTabRoutePath;

  /**
   * Default zap amount
   */
  defaultZapAmount: number;

  /**
   * Auto-zap every post
   */
  autoZap: boolean;

  /**
   * Proof-of-Work to apply to all events
   */
  pow?: number;

  /**
   * Collect usage metrics
   */
  telemetry?: boolean;

  /**
   * Show badges on profiles
   */
  showBadges?: boolean;

  /**
   * Show user status messages on profiles
   */
  showStatus?: boolean;

  /**
   * Check event signatures
   */
  checkSigs: boolean;

  /**
   * Auto-translate when available
   */
  autoTranslate?: boolean;

  /**
   * Hides muted notes when selected
   */
  hideMutedNotes: boolean;

  /**
   * Show posts with content warning
   */
  showContentWarningPosts: boolean;

  /**
   * Mute notes outside your WoT
   */
  muteWithWoT: boolean;

  /**
   * Selected DVM provider pubkey for trending notes (kind 5300)
   */
  trendingDvmPubkey?: string;
}

export const DefaultPreferences = {
  enableReactions: true,
  reactionEmoji: "+",
  autoLoadMedia: "all",
  theme: "system",
  confirmReposts: false,
  showDebugMenus: true,
  autoShowLatest: false,
  imgProxyConfig: DefaultImgProxy,
  defaultRootTab: "following",
  defaultZapAmount: 50,
  autoZap: false,
  telemetry: true,
  showBadges: false,
  showStatus: true,
  checkSigs: true,
  autoTranslate: true,
  hideMutedNotes: false,
  muteWithWoT: false,
  showContentWarningPosts: false,
  trendingDvmPubkey: "0d9ec486275b70f0c4faec277fc4c63b9f14cb1ca1ec029f7d76210e957e5257",
} as UserPreferences;
