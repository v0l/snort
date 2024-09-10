import { dedupe } from "@snort/shared";
import { OutboxModel } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useContext, useMemo } from "react";
import { FormattedMessage } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import { CollapsedSection } from "@/Components/Collapsed";
import { RelayFavicon } from "@/Components/Relay/RelaysMetadata";
import useLogin from "@/Hooks/useLogin";
import { getRelayName } from "@/Utils";

import RelayUptime from "./uptime";

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

  return (
    <div className="flex flex-col gap-2">
      <CollapsedSection
        title={
          <h4>
            <FormattedMessage defaultMessage="Recommended Relays" />
          </h4>
        }>
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
                  <td className="flex gap-2 items-center">
                    <RelayFavicon url={a.relay} />
                    {getRelayName(a.relay)}
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
    </div>
  );
}
