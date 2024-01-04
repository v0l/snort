import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { ApiHost } from "@/Utils/Const";
import { ServiceError } from "@/Utils/Nip05/ServiceProvider";
import SnortServiceProvider, { ManageHandle } from "@/Utils/Nip05/SnortServiceProvider";

export default function TransferHandle({ handle }: { handle: ManageHandle }) {
  const { publisher } = useEventPublisher();
  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState<Array<string>>([]);

  async function startTransfer() {
    if (!newKey || !publisher) return;
    const sp = new SnortServiceProvider(publisher, `${ApiHost}/api/v1/n5sp`);
    setError([]);
    const rsp = await sp.transfer(handle.id, newKey);
    if ("error" in rsp) {
      setError((rsp as ServiceError).errors);
      return;
    }
    navigate(-1);
  }

  return (
    <div>
      <h4>
        <FormattedMessage defaultMessage="Transfer to Pubkey" id="5u6iEc" />
      </h4>
      <div className="flex">
        <div className="grow">
          <input
            type="text"
            className="w-max mr10"
            placeholder={formatMessage({
              defaultMessage: "Public key (npub/nprofile)",
              id: "VR5eHw",
            })}
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
          />
        </div>
        <AsyncButton onClick={() => startTransfer()}>
          <FormattedMessage defaultMessage="Transfer" id="DtYelJ" />
        </AsyncButton>
      </div>
      {error && <b className="error">{error}</b>}
    </div>
  );
}
