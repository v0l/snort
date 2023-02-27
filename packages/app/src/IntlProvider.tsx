import { type ReactNode } from "react";
import { useSelector } from "react-redux";
import { IntlProvider as ReactIntlProvider } from "react-intl";

import { RootState } from "State/Store";

import enMessages from "translations/en.json";
import esMessages from "translations/es.json";
import zhMessages from "translations/zh.json";
import jaMessages from "translations/ja.json";
import frMessages from "translations/fr.json";
import huMessages from "translations/hu.json";
import idMessages from "translations/id.json";
import arMessages from "translations/ar.json";

const DEFAULT_LOCALE = "en-US";

const getMessages = (locale: string) => {
  const truncatedLocale = locale.toLowerCase().split(/[_-]+/)[0];

  switch (truncatedLocale) {
    case "en":
      return enMessages;
    case "es":
      return esMessages;
    case "zh":
      return zhMessages;
    case "ja":
      return jaMessages;
    case "fr":
      return frMessages;
    case "hu":
      return huMessages;
    case "id":
      return idMessages;
    case "ar":
      return arMessages;
    default:
      return enMessages;
  }
};

export const IntlProvider = ({ children }: { children: ReactNode }) => {
  const lang = useSelector((s: RootState) => s.login.preferences.language);
  const locale = lang ?? getLocale();

  return (
    <ReactIntlProvider locale={locale} messages={getMessages(locale)}>
      {children}
    </ReactIntlProvider>
  );
};

export const getLocale = () => {
  return (navigator.languages && navigator.languages[0]) || navigator.language || DEFAULT_LOCALE;
};
