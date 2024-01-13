import { unixNow } from "@snort/shared";
import { SnortContext } from "@snort/system-react";
import {useContext, useEffect, useMemo, useState} from "react";
import { FormattedMessage } from "react-intl";

import Timeline from "@/Components/Feed/Timeline";
import useHistoryState from "@/Hooks/useHistoryState";
import useLogin from "@/Hooks/useLogin";
import { debounce, getRelayName, sha256 } from "@/Utils";

interface RelayOption {
  url: string;
  paid: boolean;
}

export const GlobalTab = () => {
  const { relays } = useLogin();
  const [relay, setRelay] = useHistoryState<RelayOption>(undefined, "global-relay");
  const [allRelays, setAllRelays] = useHistoryState<RelayOption[]>(undefined, "global-relay-options");
  const [now] = useState(unixNow());
  const system = useContext(SnortContext);

  function globalRelaySelector() {
    if (!allRelays || allRelays.length === 0) return null;

    const paidRelays = allRelays.filter(a => a.paid);
    const publicRelays = allRelays.filter(a => !a.paid);
    return (
      <div className="flex items-center g8 justify-end nowrap">
        <h3>
          <FormattedMessage
            defaultMessage="Relay"
            id="KHK8B9"
            description="Label for reading global feed from specific relays"
          />
        </h3>
        <select
          className="f-ellipsis"
          onChange={e => setRelay(allRelays.find(a => a.url === e.target.value))}
          value={relay?.url}>
          {paidRelays.length > 0 && (
            <optgroup label="Paid Relays">
              {paidRelays.map(a => (
                <option key={a.url} value={a.url}>
                  {getRelayName(a.url)}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Public Relays">
            {publicRelays.map(a => (
              <option key={a.url} value={a.url}>
                {getRelayName(a.url)}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    );
  }

  useEffect(() => {
    return debounce(500, () => {
      const ret: RelayOption[] = [];
      system.Sockets.forEach(v => {
        if (v.connected) {
          ret.push({
            url: v.address,
            paid: v.info?.limitation?.payment_required ?? false,
          });
        }
      });
      ret.sort(a => (a.paid ? -1 : 1));

      if (ret.length > 0 && !relay) {
        setRelay(ret[0]);
      }
      setAllRelays(ret);
    });
  }, [relays, relay]);

  const subject = useMemo(() => ({
    type: "global",
    items: [],
    relay: [relay.url],
    discriminator: `all-${sha256(relay.url)}`,
  }), [relay.url]);

  return (
    <>
      {globalRelaySelector()}
      {relay && (
        <Timeline
          subject={subject}
          postsOnly={false}
          method={"TIME_RANGE"}
          window={600}
          now={now}
        />
      )}
    </>
  );
};
