import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";

import { RelaySettings } from "@snort/nostr";
import Relay from "Element/Relay";
import useEventPublisher from "Feed/EventPublisher";
import { setRelays } from "State/Login";
import { RootState } from "State/Store";
import { randomSample } from "Util";

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
    try {
      const onlineRelays = await fetch("https://api.nostr.watch/v1/online").then(r => r.json());
      const settingsEv = await publisher.saveRelaysSettings();
      const rs = Object.keys(relays).concat(randomSample(onlineRelays, 20));
      publisher.broadcastAll(settingsEv, rs);
    } catch (error) {
      console.error(error);
    }
  }

  function exportRelays() {
    navigator.clipboard.writeText(Object.keys(relays).join("\r\n"));
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
            placeholder="wss://relay.com wss://relay1.com;wss://relay2.com,wss://relay3.com"
            value={newRelay}
            onChange={e => setNewRelay(e.target.value)}
          />
        </div>
        <small className="mb10">
          <FormattedMessage {...messages.AddRelaysHelp} />
        </small>
        <div className="flex">
          <div className="f-grow"></div>
          <button className="secondary mb10" onClick={() => addNewRelay()}>
            <FormattedMessage {...messages.AddRelays} />
          </button>
        </div>
      </>
    );
  }

  function addNewRelay() {
    if (newRelay?.length) {
      let seps = "; ,".split("");
      let newRelays: string[] = [newRelay];

      if ((seps = seps.filter(s => newRelay.includes(s))).length) {
        // newRalay into arary
        newRelays = seps.flatMap(sep => newRelay.split(sep));
      }

      const parsedRelays = newRelays
        .map((url: string) => {
          url = url?.trim() ?? undefined;
          try {
            if (url && !url.startsWith("ws")) {
              url = `wss://${url}`;
            }
            return new URL(url).toString();
          } catch (_) {
            // noop
          }
          return "";
        })
        .filter(Boolean);

      console.log("parsed relays:", parsedRelays);

      const payload = {
        relays: {
          ...parsedRelays.reduce(
            (c: Record<string, { read: boolean; write: boolean }>, key: string) => {
              key = key?.endsWith("/") ? key.substring(0, key.length - 1) : key;
              return (
                (!Object.keys(c).some(k => !k.includes(key)) &&
                  (c[key] = c[key] || { read: false, write: false }) &&
                  false) ||
                c
              );
            },
            { ...relays }
          ),
        },
        createdAt: Math.floor(new Date().getTime() / 1000),
      };

      dispatch(setRelays(payload));

      setNewRelay("");
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
        <button className="mr10" type="button" onClick={() => exportRelays()}>
          <FormattedMessage {...messages.ExportToClipboard} />
        </button>
        <button type="button" onClick={() => saveRelays()}>
          <FormattedMessage {...messages.Save} />
        </button>
      </div>
      {addRelay()}
    </>
  );
};

export default RelaySettingsPage;
