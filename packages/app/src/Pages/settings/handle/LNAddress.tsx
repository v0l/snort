import { LNURL } from "@snort/shared";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { ApiHost } from "@/Utils/Const";
import SnortServiceProvider, { ForwardType, type ManageHandle } from "@/Utils/Nip05/SnortServiceProvider";

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
          id: "0jOEtS",
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
    <>
      <h4>
        <FormattedMessage defaultMessage="Update Lightning Address" />
      </h4>
      <FormattedMessage defaultMessage="Your handle will act like a lightning address and will redirect to your chosen LNURL or Lightning address" />

      <ul className="list-disc">
        <li>
          <FormattedMessage defaultMessage="Redirect issues HTTP redirect to the supplied lightning address" />
        </li>
        <li>
          <FormattedMessage defaultMessage="Proxy uses HODL invoices to forward the payment, which hides the pubkey of your node" />
        </li>
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          className="grow"
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
    </>
  );
}
