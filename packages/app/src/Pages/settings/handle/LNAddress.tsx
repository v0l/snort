import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { LNURL } from "@snort/shared";

import { ApiHost } from "Const";
import AsyncButton from "Element/AsyncButton";
import useEventPublisher from "Feed/EventPublisher";
import SnortServiceProvider, { ManageHandle } from "Nip05/SnortServiceProvider";

export default function LNForwardAddress({ handle }: { handle: ManageHandle }) {
  const { formatMessage } = useIntl();
  const publisher = useEventPublisher();

  const [newAddress, setNewAddress] = useState(handle.lnAddress ?? "");
  const [error, setError] = useState("");

  async function startUpdate() {
    if (!publisher) return;

    const req = {
      lnAddress: newAddress,
    };

    setError("");
    try {
      const svc = new LNURL(newAddress);
      await svc.load();
    } catch {
      setError(
        formatMessage({
          defaultMessage: "Invalid LNURL",
        })
      );
      return;
    }

    const sp = new SnortServiceProvider(publisher, `${ApiHost}/api/v1/n5sp`);
    const rsp = await sp.patch(handle.id, req);
    if ("error" in rsp) {
      setError(rsp.error);
    }
  }

  return (
    <div className="card">
      <h4>
        <FormattedMessage defaultMessage="Update Lightning Address" />
      </h4>
      <p>
        <FormattedMessage defaultMessage="Your handle will act like a lightning address and will redirect to your chosen LNURL or Lightning address" />
      </p>
      <div className="flex">
        <div className="f-grow">
          <input
            type="text"
            className="w-max mr10"
            placeholder={formatMessage({
              defaultMessage: "LNURL or Lightning Address",
            })}
            value={newAddress}
            onChange={e => setNewAddress(e.target.value)}
          />
        </div>
        <AsyncButton onClick={() => startUpdate()}>
          <FormattedMessage defaultMessage="Update" />
        </AsyncButton>
      </div>
      {error && <b className="error">{error}</b>}
    </div>
  );
}
