export const DefaultLocale = "en-US";

export const getLocale = () => {
  return (navigator.languages && navigator.languages[0]) ?? navigator.language ?? DefaultLocale;
};
export const AllLanguageCodes = [
  "en",
  "ja",
  "es",
  "hu",
  "zh-CN",
  "zh-TW",
  "fr",
  "ar",
  "it",
  "id",
  "de",
  "ru",
  "sv",
  "hr",
  "ta-IN",
  "fa-IR",
  "th",
  "pt-BR",
  "sw",
  "nl",
  "fi",
  "ko",
];
