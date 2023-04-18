import { type ReactNode } from "react";
import { IntlProvider as ReactIntlProvider } from "react-intl";

import enMessages from "translations/en.json";
import esMessages from "translations/es_ES.json";
import zhMessages from "translations/zh_CN.json";
import twMessages from "translations/zh_TW.json";
import jaMessages from "translations/ja_JP.json";
import frMessages from "translations/fr_FR.json";
import huMessages from "translations/hu_HU.json";
import idMessages from "translations/id_ID.json";
import arMessages from "translations/ar_SA.json";
import itMessages from "translations/it_IT.json";
import deMessages from "translations/de_DE.json";
import ruMessages from "translations/ru_RU.json";
import svMessages from "translations/sv_SE.json";
import hrMessages from "translations/hr_HR.json";
import taINMessages from "translations/ta_IN.json";

import useLogin from "Hooks/useLogin";

const DefaultLocale = "en-US";

const getMessages = (locale: string) => {
  const truncatedLocale = locale.toLowerCase().split(/[_-]+/)[0];

  const matchLang = (lng: string) => {
    switch (lng) {
      case "es-ES":
      case "es":
        return esMessages;
      case "zh-CN":
      case "zh-Hans-CN":
      case "zh":
        return zhMessages;
      case "zh-TW":
        return twMessages;
      case "ja-JP":
      case "ja":
        return jaMessages;
      case "fr-FR":
      case "fr":
        return frMessages;
      case "hu-HU":
      case "hu":
        return huMessages;
      case "id-ID":
      case "id":
        return idMessages;
      case "ar-SA":
      case "ar":
        return arMessages;
      case "it-IT":
      case "it":
        return itMessages;
      case "de-DE":
      case "de":
        return deMessages;
      case "ru-RU":
      case "ru":
        return ruMessages;
      case "sv-SE":
      case "sv":
        return svMessages;
      case "hr-HR":
      case "hr":
        return hrMessages;
      case "ta-IN":
      case "ta":
        return taINMessages;
      case DefaultLocale:
      case "en":
        return enMessages;
    }
  };

  return matchLang(locale) ?? matchLang(truncatedLocale) ?? enMessages;
};

export const IntlProvider = ({ children }: { children: ReactNode }) => {
  const { language } = useLogin().preferences;
  const locale = language ?? getLocale();

  return (
    <ReactIntlProvider locale={locale} messages={getMessages(locale)}>
      {children}
    </ReactIntlProvider>
  );
};

export const getLocale = () => {
  return (navigator.languages && navigator.languages[0]) ?? navigator.language ?? DefaultLocale;
};
