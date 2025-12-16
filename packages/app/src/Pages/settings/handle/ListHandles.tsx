import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { ErrorOrOffline } from "@/Components/ErrorOrOffline";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { ApiHost } from "@/Utils/Const";
import SnortServiceProvider, { type ManageHandle } from "@/Utils/Nip05/SnortServiceProvider";
import Nip05 from "@/Components/User/Nip05";

export default function ListHandles() {
  const { publisher } = useEventPublisher();
  const [handles, setHandles] = useState<Array<ManageHandle>>([]);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    loadHandles().catch(e => {
      if (e instanceof Error) {
        setError(e);
      }
    });
  }, [publisher]);

  async function loadHandles() {
    if (!publisher) return;
    const sp = new SnortServiceProvider(publisher, `${ApiHost}/api/v1/n5sp`);
    const list = await sp.list();
    setHandles(list as Array<ManageHandle>);
  }

  return (
    <div className="flex flex-col gap-4">
      {handles.length === 0 && (
        <small>
          <FormattedMessage defaultMessage="No handles found" />
        </small>
      )}
      {handles.map(a => (
        <div className="flex items-center justify-between" key={a.id}>
          <h4>{publisher?.pubKey && <Nip05 pubkey={publisher?.pubKey} nip05={`${a.handle}@${a.domain}`} />}</h4>
          <Link to="manage" state={a}>
            <button>
              <FormattedMessage defaultMessage="Manage" />
            </button>
          </Link>
        </div>
      ))}
      <Link to="/nostr-address">
        <button>
          <FormattedMessage defaultMessage="Buy Nostr Address" />
        </button>
      </Link>

      {error && <ErrorOrOffline error={error} onRetry={loadHandles} />}
    </div>
  );
}
