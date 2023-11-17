import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { LNURL } from "@snort/shared";

import { ApiHost } from "@/Const";
import AsyncButton from "@/Element/AsyncButton";
import useEventPublisher from "@/Hooks/useEventPublisher";
import SnortServiceProvider, { ForwardType, ManageHandle } from "@/Nip05/SnortServiceProvider";

export default function LNForwardAddress({ handle }: { handle: ManageHandle }) {
  const { formatMessage } = useIntl();
  const { publisher } = useEventPublisher();

  const [newAddress, setNewAddress] = useState(handle.lnAddress ?? "");
  const [fwdType, setFwdType] = useState(handle.forwardType ?? ForwardType.Redirect);
  const [error, setError] = useState("");

  async function startUpdate() {
    if (!publisher) return;

    const req = {
      lnAddress: newAddress,
      forwardType: fwdType,
    };

    setError("");
    try {
      const svc = new LNURL(newAddress);
      await svc.load();
    } catch {
      setError(
        formatMessage({
          defaultMessage: "Invalid LNURL",
        }),
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
    <div>
      <h4>
        <FormattedMessage defaultMessage="Update Lightning Address" />
      </h4>
      <p>
        <FormattedMessage defaultMessage="Your handle will act like a lightning address and will redirect to your chosen LNURL or Lightning address" />
      </p>

      <p>
        <small>
          <FormattedMessage defaultMessage="Redirect issues HTTP redirect to the supplied lightning address" />
          <br />
          <FormattedMessage defaultMessage="Proxy uses HODL invoices to forward the payment, which hides the pubkey of your node" />
        </small>
      </p>
      <div className="flex g8">
        <input
          type="text"
          className="w-max"
          placeholder={formatMessage({
            defaultMessage: "LNURL or Lightning Address",
          })}
          value={newAddress}
          onChange={e => setNewAddress(e.target.value)}
        />
        <select value={fwdType} onChange={e => setFwdType(Number(e.target.value))}>
          <option value={ForwardType.Redirect}>Redirect</option>
          <option value={ForwardType.ProxyDirect}>Proxy</option>
        </select>
        <AsyncButton onClick={() => startUpdate()}>
          <FormattedMessage defaultMessage="Update" />
        </AsyncButton>
      </div>
      {error && <b className="error">{error}</b>}
    </div>
  );
}
