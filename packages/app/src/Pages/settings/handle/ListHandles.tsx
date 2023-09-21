import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useNavigate } from "react-router-dom";

import { ApiHost } from "Const";
import useEventPublisher from "Hooks/useEventPublisher";
import SnortServiceProvider, { ManageHandle } from "Nip05/SnortServiceProvider";

export default function ListHandles() {
  const navigate = useNavigate();
  const publisher = useEventPublisher();
  const [handles, setHandles] = useState<Array<ManageHandle>>([]);

  useEffect(() => {
    loadHandles().catch(console.error);
  }, [publisher]);

  async function loadHandles() {
    if (!publisher) return;
    const sp = new SnortServiceProvider(publisher, `${ApiHost}/api/v1/n5sp`);
    const list = await sp.list();
    setHandles(list as Array<ManageHandle>);
  }

  return (
    <>
      {handles.length === 0 && (
        <FormattedMessage
          defaultMessage="It looks like you dont have any, check {link} to buy one!"
          values={{
            link: (
              <Link to="/nostr-address">
                <FormattedMessage defaultMessage="Buy Handle" />
              </Link>
            ),
          }}
        />
      )}
      {handles.map(a => (
        <div className="flex f-space" key={a.id}>
          <h4 className="nip05">
            {a.handle}@
            <span className="domain" data-domain={a.domain?.toLowerCase()}>
              {a.domain}
            </span>
          </h4>
          <button
            onClick={() =>
              navigate("manage", {
                state: a,
              })
            }>
            <FormattedMessage defaultMessage="Manage" />
          </button>
        </div>
      ))}
      {handles.length > 0 && (
        <button onClick={() => navigate("/nostr-address")}>
          <FormattedMessage defaultMessage="Buy Handle" />
        </button>
      )}
    </>
  );
}
