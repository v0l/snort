import { useIntl } from "react-intl";

import messages from "../messages";

export interface FollowsYouProps {
  followsMe: boolean;
}

export default function FollowsYou({ followsMe }: FollowsYouProps) {
  const { formatMessage } = useIntl();
  return followsMe ? (
    <span className="layer-1 text-xs font-normal px-1.5 py-1 leading-none">{formatMessage(messages.FollowsYou)}</span>
  ) : null;
}
