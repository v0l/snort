/* eslint-disable max-lines */
import { dedupe, removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { OutboxModel } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useContext, useMemo, useSyncExternalStore } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { Link } from "react-router-dom";

import { RelayMetrics } from "@/Cache";
import AsyncButton from "@/Components/Button/AsyncButton";
import { CollapsedSection } from "@/Components/Collapsed";
import { RelayFavicon } from "@/Components/Relay/RelaysMetadata";
import RelayUptime from "@/Components/Relay/uptime";
import Uptime from "@/Components/Relay/uptime";
import UptimeLabel from "@/Components/Relay/uptime-label";
import { useCloseRelays } from "@/Hooks/useCloseRelays";
import useLogin from "@/Hooks/useLogin";
import { getRelayName } from "@/Utils";

export function DiscoverRelays() {
  const { follows, relays, state } = useLogin(l => ({
    follows: l.state.follows,
    relays: l.state.relays,
    v: l.state.version,
    state: l.state,
  }));
  const system = useContext(SnortContext);

  const topWriteRelays = useMemo(() => {
    const outbox = OutboxModel.fromSystem(system);
    return outbox
      .pickTopRelays(follows ?? [], 1e31, "write")
      .filter(a => !(relays?.some(b => b.url === a.key) ?? false));
  }, [follows, relays]);

  const metrics = useSyncExternalStore(
    c => RelayMetrics.hook(c, "*"),
    () => RelayMetrics.snapshot(),
  );
  /// Using collected relay metrics
  const reliableRelays = useMemo(
    () =>
      removeUndefined(
        RelayMetrics.snapshot().map(a => {
          const addr = sanitizeRelayUrl(a.addr);
          if (!addr) return;
          return {
            ...a,
            addr,
            avgLatency: a.latency.reduce((acc, v) => acc + v, 0) / a.latency.length,
          };
        }),
      )
        .filter(a => a.connects > 0 && a.addr.startsWith("wss://") && !relays?.some(b => b.url === a.addr))
        .sort((a, b) =>
          (isNaN(b.avgLatency) ? 99999 : b.avgLatency) > (isNaN(a.avgLatency) ? 99999 : a.avgLatency) ? -1 : 1,
        ),
    [relays, metrics],
  );

  const closeRelays = useCloseRelays();
  return (
    <div className="flex flex-col gap-4">
      <CollapsedSection
        title={
          <div className="text-xl">
            <FormattedMessage defaultMessage="Popular Relays" />
          </div>
        }>
        <small>
          <FormattedMessage defaultMessage="Popular relays used by people you follow." />
        </small>
        <table className="table">
          <thead>
            <tr className="text-gray-light uppercase">
              <th>
                <FormattedMessage defaultMessage="Relay" description="Relay name (URL)" />
              </th>
              <th>
                <FormattedMessage defaultMessage="Uptime" />
              </th>
              <th>
                <FormattedMessage defaultMessage="Users" />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dedupe(topWriteRelays.flatMap(a => a.relays))
              .map(a => ({ relay: a, count: topWriteRelays.filter(b => b.relays.includes(a)).length }))
              .sort((a, b) => (a.count > b.count ? -1 : 1))
              .filter(a => !relays?.some(b => b.url === a.relay))
              .slice(0, 20)
              .map(a => (
                <tr key={a.relay}>
                  <td>
                    <Link to={`/settings/relays/${encodeURIComponent(a.relay)}`} className="flex gap-2 items-center">
                      <RelayFavicon url={a.relay} />
                      {getRelayName(a.relay)}
                    </Link>
                  </td>
                  <td className="text-center">
                    <RelayUptime url={a.relay} />
                  </td>
                  <td className="text-center">{a.count}</td>
                  <td className="text-end">
                    <AsyncButton
                      className="!py-1 mb-1"
                      onClick={async () => {
                        await state.addRelay(a.relay, { read: true, write: true });
                      }}>
                      <FormattedMessage defaultMessage="Add" />
                    </AsyncButton>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </CollapsedSection>
      <CollapsedSection
        title={
          <div className="text-xl">
            <FormattedMessage defaultMessage="Reliable Relays" />
          </div>
        }>
        <small>
          <FormattedMessage defaultMessage="Relays which you have connected to before and appear to be reliable." />
        </small>
        <table className="table">
          <thead>
            <tr className="text-gray-light uppercase">
              <th>
                <FormattedMessage defaultMessage="Relay" description="Relay name (URL)" />
              </th>
              <th>
                <FormattedMessage defaultMessage="Uptime" />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reliableRelays.slice(0, 40).map(a => (
              <tr key={a.addr}>
                <td title={a.addr}>
                  <Link to={`/settings/relays/${encodeURIComponent(a.addr)}`} className="flex gap-2 items-center">
                    <RelayFavicon url={a.addr} />
                    {getRelayName(a.addr)}
                  </Link>
                </td>
                <td className="text-center">
                  <UptimeLabel avgPing={a.avgLatency} />
                </td>
                <td className="text-end">
                  <AsyncButton
                    className="!py-1 mb-1"
                    onClick={async () => {
                      await state.addRelay(a.addr, { read: true, write: true });
                    }}>
                    <FormattedMessage defaultMessage="Add" />
                  </AsyncButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsedSection>

      <CollapsedSection
        title={
          <div className="text-xl">
            <FormattedMessage defaultMessage="Close Relays" />
          </div>
        }>
        <small>
          <FormattedMessage defaultMessage="Relays close to your geographic location." />
        </small>
        <table className="table">
          <thead>
            <tr className="text-gray-light uppercase">
              <th>
                <FormattedMessage defaultMessage="Relay" description="Relay name (URL)" />
              </th>
              <th>
                <FormattedMessage defaultMessage="Distance" />
              </th>
              <th>
                <FormattedMessage defaultMessage="Uptime" />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {closeRelays
              .filter(a => !isNaN(a.distance))
              .slice(0, 100)
              .map(a => (
                <tr key={a.addr}>
                  <td title={a.addr}>
                    <Link to={`/settings/relays/${encodeURIComponent(a.addr)}`} className="flex gap-2 items-center">
                      <RelayFavicon url={a.addr} />
                      {getRelayName(a.addr)}
                    </Link>
                  </td>
                  <td className="text-center">
                    <FormattedMessage
                      defaultMessage="{n} km"
                      values={{
                        n: <FormattedNumber value={a.distance / 1000} maximumFractionDigits={0} />,
                      }}
                    />
                  </td>
                  <td className="text-center">
                    <Uptime url={a.addr} />
                  </td>
                  <td className="text-end">
                    <AsyncButton
                      className="!py-1 mb-1"
                      onClick={async () => {
                        await state.addRelay(a.addr, { read: true, write: true });
                      }}>
                      <FormattedMessage defaultMessage="Add" />
                    </AsyncButton>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </CollapsedSection>
    </div>
  );
}
