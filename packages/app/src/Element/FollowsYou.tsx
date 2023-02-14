import "./FollowsYou.css";
import { useIntl } from "react-intl";

import messages from "./messages";

export interface FollowsYouProps {
  followsMe: boolean;
}

export default function FollowsYou({ followsMe }: FollowsYouProps) {
  const { formatMessage } = useIntl();
  return followsMe ? <span className="follows-you">{formatMessage(messages.FollowsYou)}</span> : null;
}
