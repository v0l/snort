import { type ReactNode } from "react";
import { IntlProvider as ReactIntlProvider } from "react-intl";
import enMessages from "translations/en";
import esMessages from "translations/es";
import zhMessages from "translations/zh";
import jaMessages from "translations/ja";
import frMessages from "translations/fr";
import huMessages from "translations/hu";
import idMessages from "translations/id";
import arMessages from "translations/ar";

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
  const getLocale = () => {
    return (navigator.languages && navigator.languages[0]) || navigator.language || DEFAULT_LOCALE;
  };
  const locale = getLocale();

  return (
    <ReactIntlProvider locale={locale} messages={getMessages(locale)}>
      {children}
    </ReactIntlProvider>
  );
};
