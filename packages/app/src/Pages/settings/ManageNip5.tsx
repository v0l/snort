import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";

import { ApiHost } from "Const";
import Modal from "Element/Modal";
import useEventPublisher from "Feed/EventPublisher";
import { ServiceError } from "Nip05/ServiceProvider";
import SnortServiceProvider, { ManageHandle } from "Nip05/SnortServiceProvider";

export default function Nip5ManagePage() {
  const publisher = useEventPublisher();
  const { formatMessage } = useIntl();
  const [handles, setHandles] = useState<Array<ManageHandle>>();
  const [transfer, setTransfer] = useState("");
  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState<Array<string>>([]);
  const sp = new SnortServiceProvider(publisher, `${ApiHost}/api/v1/n5sp`);

  useEffect(() => {
    loadHandles().catch(console.error);
  }, []);

  async function loadHandles() {
    const list = await sp.list();
    setHandles(list as Array<ManageHandle>);
  }

  async function startTransfer() {
    if (!transfer || !newKey) return;
    setError([]);
    const rsp = await sp.transfer(transfer, newKey);
    if ("error" in rsp) {
      setError((rsp as ServiceError).errors);
      return;
    }
    await loadHandles();
    setTransfer("");
    setNewKey("");
  }

  function close() {
    setTransfer("");
    setNewKey("");
    setError([]);
  }

  if (!handles) {
    return null;
  }
  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Nostr Address" />
      </h3>
      {handles.length === 0 && (
        <FormattedMessage
          defaultMessage="It looks like you dont have any, check {link} to buy one!"
          values={{
            link: (
              <Link to="/verification">
                <FormattedMessage defaultMessage="Verification" />
              </Link>
            ),
          }}
        />
      )}
      {handles.map(a => (
        <>
          <div className="card flex" key={a.id}>
            <div className="f-grow">
              <h4 className="nip05">
                {a.handle}@
                <span className="domain" data-domain={a.domain?.toLowerCase()}>
                  {a.domain}
                </span>
              </h4>
            </div>
            <div>
              <button className="button" onClick={() => setTransfer(a.id)}>
                <FormattedMessage defaultMessage="Transfer" />
              </button>
            </div>
          </div>
        </>
      ))}
      {transfer && (
        <Modal onClose={close}>
          <h4>
            <FormattedMessage defaultMessage="Transfer to Pubkey" />
          </h4>
          <div className="flex">
            <div className="f-grow">
              <input
                type="text"
                className="w-max mr10"
                placeholder={formatMessage({
                  defaultMessage: "Public key (npub/nprofile)",
                })}
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
              />
            </div>
            <button className="button" onClick={() => startTransfer()}>
              <FormattedMessage defaultMessage="Transfer" />
            </button>
          </div>
          {error && <b className="error">{error}</b>}
        </Modal>
      )}
    </>
  );
}
