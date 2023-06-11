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
  fileUploader: "void.cat" | "nostr.build" | "nostrimg.com";

  /**
   * Use imgproxy to optimize images
   */
  imgProxyConfig: ImgProxySettings | null;

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
}

export const DefaultPreferences = {
  language: "en",
  enableReactions: true,
  reactionEmoji: "+",
  autoLoadMedia: "follows-only",
  theme: "system",
  confirmReposts: false,
  showDebugMenus: false,
  autoShowLatest: false,
  fileUploader: "void.cat",
  imgProxyConfig: DefaultImgProxy,
  defaultRootTab: "notes",
  defaultZapAmount: 50,
  autoZap: false,
} as UserPreferences;
