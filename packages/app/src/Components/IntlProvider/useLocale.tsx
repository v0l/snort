import { useSyncExternalStore } from "react";

import { getLocale } from "@/Components/IntlProvider/IntlProviderUtils";
import { LangOverride } from "@/Components/IntlProvider/langStore";
import usePreferences from "@/Hooks/usePreferences";

export function useLocale() {
  const language = usePreferences(s => s.language);
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
