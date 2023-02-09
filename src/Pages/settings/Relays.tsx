import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";

import Relay from "Element/Relay";
import useEventPublisher from "Feed/EventPublisher";
import { RootState } from "State/Store";
import { RelaySettings } from "Nostr/Connection";
import { setRelays } from "State/Login";

import messages from "./messages";

const RelaySettingsPage = () => {
  const dispatch = useDispatch();
  const publisher = useEventPublisher();
  const relays = useSelector<RootState, Record<string, RelaySettings>>(s => s.login.relays);
  const [newRelay, setNewRelay] = useState<string>();

  async function saveRelays() {
    const ev = await publisher.saveRelays();
    publisher.broadcast(ev);
    publisher.broadcastForBootstrap(ev);
  }

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
            onChange={e => setNewRelay(e.target.value)}
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
    </>
  );
};

export default RelaySettingsPage;
