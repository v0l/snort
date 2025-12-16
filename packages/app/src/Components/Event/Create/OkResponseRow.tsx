import { sanitizeRelayUrl, unwrap } from "@snort/shared";
import type { OkResponse } from "@snort/system";
import { useState } from "react";
import { useIntl } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import IconButton from "@/Components/Button/IconButton";
import Icon from "@/Components/Icons/Icon";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { getRelayName } from "@/Utils";

export function OkResponseRow({ rsp, close }: { rsp: OkResponse; close: () => void }) {
  const [r, setResult] = useState(rsp);
  const { formatMessage } = useIntl();
  const { system } = useEventPublisher();
  const login = useLogin();

  async function removeRelayFromResult(r: OkResponse) {
    login.state.removeRelay(unwrap(sanitizeRelayUrl(r.relay)));
    await login.state.saveRelays();
    close();
  }

  async function retryPublish(r: OkResponse) {
    const rsp = await system.WriteOnceToRelay(unwrap(sanitizeRelayUrl(r.relay)), r.event);
    setResult(rsp);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col grow gap-1">
        <b>{getRelayName(r.relay)}</b>
        {r.message && <small>{r.message}</small>}
      </div>
      {!r.ok && (
        <div className="flex gap-2">
          <AsyncButton
            onClick={() => retryPublish(r)}
            className="p-1 rounded-lg flex items-center secondary"
            title={formatMessage({
              defaultMessage: "Retry publishing",
              id: "9kSari",
            })}>
            <Icon name="refresh-ccw-01" />
          </AsyncButton>
          <AsyncButton
            onClick={() => removeRelayFromResult(r)}
            className="p-1 rounded-lg flex items-center secondary"
            title={formatMessage({
              defaultMessage: "Remove from my relays",
              id: "UJTWqI",
            })}>
            <Icon name="trash-01" className="trash-icon" />
          </AsyncButton>
        </div>
      )}
      <IconButton icon={{ name: "x" }} onClick={close} />
    </div>
  );
}
