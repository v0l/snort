import { type ReactNode } from "react";
import { IntlProvider as ReactIntlProvider } from "react-intl";

import { ReadPreferences } from "State/Login";
import enMessages from "translations/en.json";
import esMessages from "translations/es.json";
import zhMessages from "translations/zh.json";
import jaMessages from "translations/ja.json";
import frMessages from "translations/fr.json";
import huMessages from "translations/hu.json";
import idMessages from "translations/id.json";
import arMessages from "translations/ar.json";
import itMessages from "translations/it.json";

const DEFAULT_LOCALE = "en-US";

const getMessages = (locale: string) => {
  const truncatedLocale = locale.toLowerCase().split(/[_-]+/)[0];

  switch (truncatedLocale) {
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
    case "it":
      return itMessages;
    default:
      return enMessages;
  }
};

export const IntlProvider = ({ children }: { children: ReactNode }) => {
  const { language } = ReadPreferences();
  const locale = language ?? getLocale();

  return (
    <ReactIntlProvider locale={locale} messages={getMessages(locale)}>
      {children}
    </ReactIntlProvider>
  );
};

export const getLocale = () => {
  return (navigator.languages && navigator.languages[0]) || navigator.language || DEFAULT_LOCALE;
};
