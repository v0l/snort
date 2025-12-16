import { useCallback } from "react";
import { FormattedMessage } from "react-intl";

import SnortApi, { type RefCodeResponse } from "@/External/SnortApi";
import { useCopy } from "@/Hooks/useCopy";
import useEventPublisher from "@/Hooks/useEventPublisher";

import AsyncButton from "../Button/AsyncButton";
import Icon from "../Icons/Icon";
import { BaseWidget } from "./base";
import { useCached } from "@snort/system-react";

export default function InviteFriendsWidget() {
  const { publisher } = useEventPublisher();
  const loader = useCallback(() => {
    const api = new SnortApi(undefined, publisher?.signer);
    return api.getRefCode();
  }, [publisher]);
  const { data: refCode } = useCached<RefCodeResponse>(
    publisher ? `ref:${publisher.pubKey}` : undefined,
    loader,
    60 * 60 * 24,
  );
  const copy = useCopy();

  return (
    <BaseWidget
      title={<FormattedMessage defaultMessage="Invite Friends" />}
      icon="heart-solid"
      iconClassName="text-heart">
      <div className="flex flex-col gap-2">
        <FormattedMessage defaultMessage="Share a personalized invitation with friends!" />
        <div>
          <AsyncButton
            className="secondary"
            onClick={() => copy.copy(`https://${window.location.host}?ref=${refCode?.code}`)}>
            <Icon name={copy.copied ? "check" : "copy"} />
            <FormattedMessage defaultMessage="Copy link" />
          </AsyncButton>
        </div>
      </div>
    </BaseWidget>
  );
}
