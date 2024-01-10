import { ExternalStore } from "@snort/shared";
import { useSyncExternalStore } from "react";

import useLogin from "@/Hooks/useLogin";

export const DefaultLocale = "en-US";

class LangStore extends ExternalStore<string | null> {
  setLang(s: string) {
    localStorage.setItem("lang", s);
    this.notifyChange();
  }

  takeSnapshot() {
    return localStorage.getItem("lang");
  }
}

const LangOverride = new LangStore();

export function useLocale() {
  const { language } = useLogin(s => ({ language: s.appData.item.preferences.language }));
  const loggedOutLang = useSyncExternalStore(
    c => LangOverride.hook(c),
    () => LangOverride.snapshot(),
  );
  const locale = language ?? loggedOutLang ?? getLocale();
  return {
    locale,
    lang: locale.toLowerCase().split(/[_-]+/)[0],
    setOverride: (s: string) => LangOverride.setLang(s),
  };
}

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
];
