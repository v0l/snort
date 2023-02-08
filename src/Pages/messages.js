import { defineMessages } from "react-intl";
import { addIdAndDefaultMessageToMessages } from "Util";

const messages = defineMessages({
  login: "Login",
});

export default addIdAndDefaultMessageToMessages(messages, 'Pages');
