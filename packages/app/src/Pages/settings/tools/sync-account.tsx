import { unwrap } from "@snort/shared";
import { RangeSync, TaggedNostrEvent } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useContext, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import useLogin from "@/Hooks/useLogin";
import useRelays from "@/Hooks/useRelays";
import { SearchRelays } from "@/Utils/Const";

export default function SyncAccountTool() {
  const system = useContext(SnortContext);
  const login = useLogin();
  const [scan, setScan] = useState<number>();
  const [results, setResults] = useState<Array<TaggedNostrEvent>>([]);
  const myRelays = useRelays();

  async function start() {
    const relays = Object.entries(myRelays)
      .filter(([, v]) => v.write)
      .map(([k]) => k);
    const sync = new RangeSync(system);
    sync.on("event", evs => {
      setResults(r => [...r, ...evs]);
    });
    sync.on("scan", t => setScan(t));
    await sync.sync({
      authors: [unwrap(login.publicKey)],
      relays: [...relays, ...Object.keys(CONFIG.defaultRelays), ...SearchRelays],
    });
  }
  return (
    <>
      <p>
        <FormattedMessage defaultMessage="Sync all events for your profile into local cache" id="+QM0PJ" />
      </p>

      {results.length > 0 && (
        <h3>
          <FormattedMessage
            defaultMessage="Found {n} events"
            id="ufvXH1"
            values={{
              n: <FormattedNumber value={results.length} />,
            }}
          />
        </h3>
      )}
      {scan !== undefined && (
        <h4>
          <FormattedMessage
            defaultMessage="Scanning {date}"
            id="OxPdQ0"
            values={{
              date: new Date(scan * 1000).toLocaleDateString(),
            }}
          />
        </h4>
      )}
      <AsyncButton onClick={start}>
        <FormattedMessage defaultMessage="Start" id="mOFG3K" />
      </AsyncButton>
    </>
  );
}
