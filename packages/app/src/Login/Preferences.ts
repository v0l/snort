import { DefaultImgProxy } from "Const";
import { ImgProxySettings } from "Hooks/useImgProxy";

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
   * File uploading service to upload attachments to
   */
  fileUploader: "void.cat" | "nostr.build" | "nostrimg.com" | "void.cat-NIP96";

  /**
   * Use imgproxy to optimize images
   */
  imgProxyConfig?: ImgProxySettings;

  /**
   * Default page to select on load
   */
  defaultRootTab: "notes" | "conversations" | "global";

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
}

export const DefaultPreferences = {
  enableReactions: true,
  reactionEmoji: "+",
  autoLoadMedia: "all",
  theme: "system",
  confirmReposts: false,
  showDebugMenus: true,
  autoShowLatest: false,
  fileUploader: "void.cat",
  imgProxyConfig: DefaultImgProxy,
  defaultRootTab: "notes",
  defaultZapAmount: 50,
  autoZap: false,
  telemetry: true,
  showBadges: false,
  showStatus: true,
  checkSigs: false,
  autoTranslate: true,
} as UserPreferences;
