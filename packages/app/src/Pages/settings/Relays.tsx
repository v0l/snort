import { unwrap } from "@snort/shared";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import Relay from "@/Components/Relay/Relay";
import SnortApi, { RelayDistance } from "@/External/SnortApi";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import useRelays from "@/Hooks/useRelays";
import { saveRelays } from "@/Pages/settings/saveRelays";
import { getCountry, getRelayName, sanitizeRelayUrl } from "@/Utils";
import { formatShort } from "@/Utils/Number";

import messages from "./messages";

const RelaySettingsPage = () => {
  const { publisher, system } = useEventPublisher();
  const relays = useRelays();
  const { readonly, state } = useLogin(s => ({ state: s.state, readonly: s.readonly }));
  const [newRelay, setNewRelay] = useState<string>();

  const otherConnections = useMemo(() => {
    return [...system.pool].filter(([k]) => relays[k] === undefined).map(([, v]) => v);
  }, [system.pool, relays]);

  const handleNewRelayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    setNewRelay(inputValue);
  };

  async function addNewRelay() {
    const url = sanitizeRelayUrl(newRelay);
    if (url) {
      await state.addRelay(url, { read: true, write: true }, false);

      setNewRelay("");
    }
  }

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
        <AsyncButton className="secondary" onClick={() => addNewRelay()}>
          <FormattedMessage {...messages.Add} />
        </AsyncButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col g8">
      <h3>
        <FormattedMessage {...messages.Relays} />
      </h3>
      <div className="flex flex-col g8">
        {Object.keys(relays || {}).map(a => (
          <Relay addr={a} key={a} />
        ))}
      </div>
      <AsyncButton type="button" onClick={() => saveRelays(system, publisher, relays.item)} disabled={readonly}>
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
  const currentRelays = useRelays();
  const state = useLogin(s => s.state);
  const relayUrls = Object.keys(currentRelays);

  async function loadRelays() {
    const api = new SnortApi();
    setRecommendedRelays(await api.closeRelays(location.lat, location.lon, 10));
  }

  async function addNewRelay(newRelay: string) {
    const url = sanitizeRelayUrl(newRelay);
    if (url) {
      await state.addRelay(url, { read: true, write: true }, false);
    }
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
          <div key={a.url} className="bg-dark p br flex flex-col g8">
            <div className="flex justify-between items-center">
              <div className="bold">{getRelayName(a.url)}</div>
              <AsyncButton onClick={() => addNewRelay(a.url)}>
                <FormattedMessage defaultMessage="Add" />
              </AsyncButton>
            </div>
            <div className="flex flex-col g8">
              <span>{a.description}</span>
              <small>
                <FormattedMessage
                  defaultMessage="{n} km - {location}"
                  id="jTrbGf"
                  values={{
                    n: (a.distance / 1000).toFixed(0),
                    location: a.city ? `${a.city}, ${a.country}` : a.country,
                  }}
                />
              </small>
              <small>
                <FormattedMessage
                  defaultMessage="{n} users"
                  id="1H4Keq"
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
