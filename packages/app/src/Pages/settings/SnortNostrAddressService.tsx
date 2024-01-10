import { FormattedMessage } from "react-intl";

import messages from "@/Pages/messages";
import { ApiHost } from "@/Utils/Const";

export const SnortNostrAddressService = {
  name: "Snort",
  service: `${ApiHost}/api/v1/n5sp`,
  link: "https://snort.social/",
  supportLink: "https://snort.social/help",
  about: <FormattedMessage {...messages.SnortSocialNip} />,
};
