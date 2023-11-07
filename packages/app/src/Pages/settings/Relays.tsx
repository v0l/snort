import { useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { unixNowMs } from "@snort/shared";
import { EventPublisher, FullRelaySettings, RelaySettings, SystemInterface } from "@snort/system";

import Relay from "Element/Relay/Relay";
import useEventPublisher from "Hooks/useEventPublisher";
import useLogin from "Hooks/useLogin";
import { setRelays } from "Login";
import AsyncButton from "Element/AsyncButton";

import messages from "./messages";

const Blasters = ["wss://nostr.mutinywallet.com"];

export async function saveRelays(
  system: SystemInterface,
  publisher: EventPublisher | undefined,
  relays: Array<FullRelaySettings> | Record<string, RelaySettings>,
) {
  if (publisher) {
    const ev = await publisher.relayList(relays);
    await system.BroadcastEvent(ev);
    await Promise.all(Blasters.map(a => system.WriteOnceToRelay(a, ev)));
  }
}

const RelaySettingsPage = () => {
  const { publisher, system } = useEventPublisher();
  const login = useLogin();
  const relays = login.relays;
  const [newRelay, setNewRelay] = useState<string>();

  const otherConnections = useMemo(() => {
    return system.Sockets.filter(a => relays.item[a.address] === undefined);
  }, [relays]);

  const handleNewRelayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const protocol = window.location.protocol;
    if ((protocol === "https:" && inputValue.startsWith("wss://")) || protocol === "http:") {
      setNewRelay(inputValue);
    }
  };

  function addRelay() {
    return (
      <div className="flex flex-col g8">
        <h4>
          <FormattedMessage {...messages.AddRelays} />
        </h4>
        <input
          type="text"
          className="grow"
          placeholder="wss://my-relay.com"
          value={newRelay}
          onChange={handleNewRelayChange}
        />
        <button className="secondary" onClick={() => addNewRelay()}>
          <FormattedMessage {...messages.Add} />
        </button>
      </div>
    );
  }

  function addNewRelay() {
    if ((newRelay?.length ?? 0) > 0) {
      const parsed = new URL(newRelay ?? "");
      const payload = {
        ...relays.item,
        [parsed.toString()]: { read: true, write: true },
      };
      setRelays(login, payload, unixNowMs());
    }
  }

  return (
    <div className="flex flex-col g8">
      <h3>
        <FormattedMessage {...messages.Relays} />
      </h3>
      <div className="flex flex-col g8">
        {Object.keys(relays.item || {}).map(a => (
          <Relay addr={a} key={a} />
        ))}
      </div>
      <AsyncButton type="button" onClick={() => saveRelays(system, publisher, relays.item)} disabled={login.readonly}>
        <FormattedMessage {...messages.Save} />
      </AsyncButton>
      {addRelay()}
      <h3>
        <FormattedMessage defaultMessage="Other Connections" />
      </h3>
      <div className="flex flex-col g8">
        {otherConnections.map(a => (
          <Relay addr={a.address} key={a.id} />
        ))}
      </div>
    </div>
  );
};

export default RelaySettingsPage;
