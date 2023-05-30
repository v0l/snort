import { useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

import { randomSample, unixNowMs } from "SnortUtils";
import Relay from "Element/Relay";
import useEventPublisher from "Feed/EventPublisher";
import { System } from "index";
import useLogin from "Hooks/useLogin";
import { setRelays } from "Login";

import messages from "./messages";
const RelaySettingsPage = () => {
  const publisher = useEventPublisher();
  const login = useLogin();
  const relays = login.relays;
  const [newRelay, setNewRelay] = useState<string>();

  const otherConnections = useMemo(() => {
    return [...System.Sockets.keys()].filter(a => relays.item[a] === undefined);
  }, [relays]);

  async function saveRelays() {
    if (publisher) {
      const ev = await publisher.contactList(login.follows.item, login.relays.item);
      publisher.broadcast(ev);
      publisher.broadcastForBootstrap(ev);
      try {
        const onlineRelays = await fetch("https://api.nostr.watch/v1/online").then(r => r.json());
        const relayList = await publisher.relayList(login.relays.item);
        const rs = Object.keys(relays.item).concat(randomSample(onlineRelays, 20));
        publisher.broadcastAll(relayList, rs);
      } catch (error) {
        console.error(error);
      }
    }
  }

  const handleNewRelayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const protocol = window.location.protocol;
    if ((protocol === "https:" && inputValue.startsWith("wss://")) || protocol === "http:") {
      setNewRelay(inputValue);
    }
  };

  function addRelay() {
    return (
      <>
        <h4>
          <FormattedMessage {...messages.AddRelays} />
        </h4>
        <div className="flex mb10">
          <input
            type="text"
            className="f-grow"
            placeholder="wss://my-relay.com"
            value={newRelay}
            onChange={handleNewRelayChange}
          />
        </div>
        <button className="secondary mb10" onClick={() => addNewRelay()}>
          <FormattedMessage {...messages.Add} />
        </button>
      </>
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
    <>
      <h3>
        <FormattedMessage {...messages.Relays} />
      </h3>
      <div className="flex f-col mb10">
        {Object.keys(relays.item || {}).map(a => (
          <Relay addr={a} key={a} />
        ))}
      </div>
      <div className="flex mt10">
        <div className="f-grow"></div>
        <button type="button" onClick={() => saveRelays()}>
          <FormattedMessage {...messages.Save} />
        </button>
      </div>
      {addRelay()}
      <h3>
        <FormattedMessage defaultMessage="Other Connections" />
      </h3>
      <div className="flex f-col mb10">
        {otherConnections.map(a => (
          <Relay addr={a} key={a} />
        ))}
      </div>
    </>
  );
};

export default RelaySettingsPage;
