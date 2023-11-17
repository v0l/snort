import { useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { unixNowMs, unwrap } from "@snort/shared";
import { EventPublisher, FullRelaySettings, RelaySettings, SystemInterface } from "@snort/system";

import Relay from "@/Element/Relay/Relay";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { setRelays } from "@/Login";
import AsyncButton from "@/Element/AsyncButton";
import SnortApi, { RelayDistance } from "@/External/SnortApi";
import { getCountry, getRelayName, sanitizeRelayUrl } from "@/SnortUtils";
import { formatShort } from "@/Number";
import { Blasters } from "@/Const";

import messages from "./messages";

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
      <CloseRelays />
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

export function CloseRelays() {
  const [relays, setRecommendedRelays] = useState<Array<RelayDistance>>();
  const country = getCountry();
  const [location, setLocation] = useState<{ lat: number; lon: number }>(country);
  const login = useLogin();
  const relayUrls = Object.keys(login.relays.item);

  async function loadRelays() {
    const api = new SnortApi();
    setRecommendedRelays(await api.closeRelays(location.lat, location.lon, 10));
  }

  useEffect(() => {
    loadRelays().catch(console.error);
  }, [location]);

  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Recommended Relays" />
      </h3>
      {"geolocation" in navigator && (
        <AsyncButton
          onClick={async () => {
            try {
              const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
              });
              setLocation({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
              });
            } catch (e) {
              console.error(e);
            }
          }}>
          <FormattedMessage defaultMessage="Use Exact Location" />
        </AsyncButton>
      )}
      {relays
        ?.filter(a => !relayUrls.includes(unwrap(sanitizeRelayUrl(a.url))) && !a.is_paid)
        .sort((a, b) => (a.distance > b.distance ? 1 : -1))
        .map(a => (
          <div className="bg-dark p br flex flex-col g8">
            <div className="flex justify-between items-center">
              <div className="bold">{getRelayName(a.url)}</div>
              <AsyncButton
                onClick={async () => {
                  setRelays(
                    login,
                    {
                      ...login.relays.item,
                      [a.url]: { read: true, write: true },
                    },
                    unixNowMs(),
                  );
                }}>
                <FormattedMessage defaultMessage="Add" />
              </AsyncButton>
            </div>
            <div className="flex flex-col g8">
              <span>{a.description}</span>
              <small>
                <FormattedMessage
                  defaultMessage="{n} km - {location}"
                  values={{
                    n: (a.distance / 1000).toFixed(0),
                    location: a.city ? `${a.city}, ${a.country}` : a.country,
                  }}
                />
              </small>
              <small>
                <FormattedMessage
                  defaultMessage="{n} users"
                  values={{
                    n: formatShort(a.users),
                  }}
                />
              </small>
            </div>
          </div>
        ))}
    </>
  );
}
