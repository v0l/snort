/// <reference types="@webbtc/webln-types" />

declare module "*.jpg" {
  const value: unknown;
  export default value;
}

declare module "*.svg" {
  const value: unknown;
  export default value;
}

declare module "*.webp" {
  const value: string;
  export default value;
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.css" {
  const stylesheet: CSSStyleSheet;
  export default stylesheet;
}

declare module "translations/*.json" {
  const value: Record<string, string>;
  export default value;
}

type EmojiShape = {
  [key: string]: {
    keywords: Array<string>;
    char: string;
    fitzpatrick_scale: boolean;
    category: string;
  };
};

declare module "emojilib" {
  const lib: EmojiShape;
}
