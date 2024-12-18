export const DefaultLocale = "en-US";

export const getLocale = () => {
  return (navigator.languages && navigator.languages[0]) ?? navigator.language ?? DefaultLocale;
};
export const getCurrency = () => {
  const locale = navigator.language || navigator.languages[0];
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
  });
  return formatter.formatToParts(1.2345).find(a => a.type === "currency")?.value ?? "USD";
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
