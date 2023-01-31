import { defineMessages } from "react-intl";
import { addIdAndDefaultMessageToMessages } from "Util";

const messages = defineMessages({
  Login: "Login",
});

export default addIdAndDefaultMessageToMessages(messages, "Pages");
