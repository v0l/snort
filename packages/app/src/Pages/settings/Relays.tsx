import { unixNowMs, unwrap } from "@snort/shared";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import Relay from "@/Components/Relay/Relay";
import SnortApi, { RelayDistance } from "@/External/SnortApi";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { saveRelays } from "@/Pages/settings/saveRelays";
import { getCountry, getRelayName, sanitizeRelayUrl } from "@/Utils";
import { setRelays } from "@/Utils/Login";
import { formatShort } from "@/Utils/Number";

import messages from "./messages";

const RelaySettingsPage = () => {
  const { publisher, system } = useEventPublisher();
  const login = useLogin();
  const relays = login.relays;
  const [newRelay, setNewRelay] = useState<string>();

  const otherConnections = useMemo(() => {
    return [...system.pool].filter(([k]) => relays.item[k] === undefined).map(([, v]) => v);
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
        <FormattedMessage defaultMessage="Other Connections" id="LF5kYT" />
      </h3>
      <div className="flex flex-col g8">
        {otherConnections.map(a => (
          <Relay addr={a.Address} key={a.Id} />
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
        <FormattedMessage defaultMessage="Recommended Relays" id="VL900k" />
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
          <FormattedMessage defaultMessage="Use Exact Location" id="0HFX0T" />
        </AsyncButton>
      )}
      {relays
        ?.filter(a => !relayUrls.includes(unwrap(sanitizeRelayUrl(a.url))) && !a.is_paid)
        .sort((a, b) => (a.distance > b.distance ? 1 : -1))
        .map(a => (
          <div key={a.url} className="bg-dark p br flex flex-col g8">
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
                <FormattedMessage defaultMessage="Add" id="2/2yg+" />
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
