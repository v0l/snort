import { useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";

import { randomSample } from "Util";
import Relay from "Element/Relay";
import useEventPublisher from "Feed/EventPublisher";
import { RootState } from "State/Store";
import { setRelays } from "State/Login";
import { System } from "System";

import messages from "./messages";

const RelaySettingsPage = () => {
  const dispatch = useDispatch();
  const publisher = useEventPublisher();
  const relays = useSelector((s: RootState) => s.login.relays);
  const [newRelay, setNewRelay] = useState<string>();

  const otherConnections = useMemo(() => {
    return [...System.Sockets.keys()].filter(a => relays[a] === undefined);
  }, [relays]);

  async function saveRelays() {
    const ev = await publisher.saveRelays();
    publisher.broadcast(ev);
    publisher.broadcastForBootstrap(ev);
    try {
      const onlineRelays = await fetch("https://api.nostr.watch/v1/online").then(r => r.json());
      const settingsEv = await publisher.saveRelaysSettings();
      const rs = Object.keys(relays).concat(randomSample(onlineRelays, 20));
      publisher.broadcastAll(settingsEv, rs);
    } catch (error) {
      console.error(error);
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
        relays: {
          ...relays,
          [parsed.toString()]: { read: false, write: false },
        },
        createdAt: Math.floor(new Date().getTime() / 1000),
      };
      dispatch(setRelays(payload));
    }
  }

  return (
    <>
      <h3>
        <FormattedMessage {...messages.Relays} />
      </h3>
      <div className="flex f-col mb10">
        {Object.keys(relays || {}).map(a => (
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
