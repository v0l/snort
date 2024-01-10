import { ReactNode, useEffect, useState } from "react";
import { IntlProvider as ReactIntlProvider } from "react-intl";

import { DefaultLocale, useLocale } from "@/Components/IntlProvider/IntlProviderUtils";
import enMessages from "@/translations/en.json";

const getMessages = (locale: string) => {
  const truncatedLocale = locale.toLowerCase().split(/[_-]+/)[0];

  const matchLang = async (lng: string) => {
    switch (lng) {
      case "es-ES":
      case "es":
        return (await import("@/translations/es_ES.json")).default;
      case "zh-CN":
      case "zh-Hans-CN":
      case "zh":
        return (await import("@/translations/zh_CN.json")).default;
      case "zh-TW":
        return (await import("@/translations/zh_TW.json")).default;
      case "ja-JP":
      case "ja":
        return (await import("@/translations/ja_JP.json")).default;
      case "fr-FR":
      case "fr":
        return (await import("@/translations/fr_FR.json")).default;
      case "hu-HU":
      case "hu":
        return (await import("@/translations/hu_HU.json")).default;
      case "id-ID":
      case "id":
        return (await import("@/translations/id_ID.json")).default;
      case "ar-SA":
      case "ar":
        return (await import("@/translations/ar_SA.json")).default;
      case "it-IT":
      case "it":
        return (await import("@/translations/it_IT.json")).default;
      case "de-DE":
      case "de":
        return (await import("@/translations/de_DE.json")).default;
      case "ru-RU":
      case "ru":
        return (await import("@/translations/ru_RU.json")).default;
      case "sv-SE":
      case "sv":
        return (await import("@/translations/sv_SE.json")).default;
      case "hr-HR":
      case "hr":
        return (await import("@/translations/hr_HR.json")).default;
      case "ta-IN":
      case "ta":
        return (await import("@/translations/ta_IN.json")).default;
      case "fa-IR":
      case "fa":
        return (await import("@/translations/fa_IR.json")).default;
      case "th-TH":
      case "th":
        return (await import("@/translations/th_TH.json")).default;
      case "pt-BR":
      case "pt":
        return (await import("@/translations/pt_BR.json")).default;
      case "sw-KE":
      case "sw":
        return (await import("@/translations/sw_KE.json")).default;
      case "nl-NL":
      case "nl":
        return (await import("@/translations/nl_NL.json")).default;
      case "fi-FI":
      case "fi":
        return (await import("@/translations/fi_FI.json")).default;
      case DefaultLocale:
      case "en":
        return enMessages;
    }
  };

  return matchLang(locale) ?? matchLang(truncatedLocale) ?? Promise.resolve(enMessages);
};
export const IntlProvider = ({ children }: { children: ReactNode }) => {
  const { locale } = useLocale();
  const [messages, setMessages] = useState<Record<string, string>>(enMessages);

  useEffect(() => {
    getMessages(locale)
      .then(x => {
        if (x) {
          setMessages(x);
        }
      })
      .catch(console.error);
  }, [locale]);

  return (
    <ReactIntlProvider locale={locale} messages={messages}>
      {children}
    </ReactIntlProvider>
  );
};
