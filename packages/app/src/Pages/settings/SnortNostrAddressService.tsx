import { FormattedMessage } from "react-intl";
import { ApiHost } from "@/Utils/Const";

export const SnortNostrAddressService = {
  name: CONFIG.appNameCapitalized,
  service: `${ApiHost}/api/v1/n5sp`,
  link: `https://${CONFIG.hostname}`,
  supportLink: `https://${CONFIG.hostname}/help`,
  about: (
    <FormattedMessage defaultMessage="Our very own NIP-05 verification service, help support the development of this site and get a shiny special badge on our site!" />
  ),
};
