import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

import SnortApi, { RefCodeResponse } from "@/External/SnortApi";
import { useCopy } from "@/Hooks/useCopy";
import useEventPublisher from "@/Hooks/useEventPublisher";

import AsyncButton from "../Button/AsyncButton";
import Icon from "../Icons/Icon";
import { BaseWidget } from "./base";

export default function InviteFriendsWidget() {
  const [refCode, setRefCode] = useState<RefCodeResponse>();
  const { publisher } = useEventPublisher();
  const api = new SnortApi(undefined, publisher);
  const copy = useCopy();

  async function loadRefCode() {
    const c = await api.getRefCode();
    setRefCode(c);
  }

  useEffect(() => {
    loadRefCode();
  }, [publisher]);

  return (
    <BaseWidget
      title={<FormattedMessage defaultMessage="Invite Friends" />}
      icon="heart-solid"
      iconClassName="text-heart">
      <div className="flex flex-col gap-2">
        <FormattedMessage defaultMessage="Share a personalized invitation with friends!" />
        <div>
          <AsyncButton onClick={() => copy.copy(`https://${window.location.host}?ref=${refCode?.code}`)}>
            <Icon name="copy" />
            <FormattedMessage defaultMessage="Copy link" />
          </AsyncButton>
        </div>
      </div>
    </BaseWidget>
  );
}
