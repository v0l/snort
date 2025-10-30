import { removeUndefined } from "@snort/shared";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import Relay from "@/Components/Relay/Relay";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import useRelays from "@/Hooks/useRelays";
import { saveRelays } from "@/Pages/settings/saveRelays";
import { sanitizeRelayUrl } from "@/Utils";

import { DiscoverRelays } from "./relays/discover";

const RelaySettingsPage = () => {
  const { publisher, system } = useEventPublisher();
  const relays = useRelays();
  const { readonly, state } = useLogin(s => ({ v: s.state.version, state: s.state, readonly: s.readonly }));
  const [newRelay, setNewRelay] = useState<string>();

  async function addNewRelay() {
    const urls = removeUndefined(
      (newRelay?.trim()?.split("\n") ?? []).map(a => {
        if (!a.startsWith("wss://") && !a.startsWith("ws://")) {
          a = `wss://${a}`;
        }
        return sanitizeRelayUrl(a);
      }),
    );
    for (const url of urls) {
      state.addRelay(url, { read: true, write: true });
    }
    // Note: Not saving here - caller should handle persistence if needed
    setNewRelay("");
  }

  function addRelay() {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xl">
          <FormattedMessage defaultMessage="Add Relays" />
        </div>
        <small>
          <FormattedMessage defaultMessage="You can add a single or multiple relays, one per line." />
        </small>
        <textarea
          placeholder="wss://my-relay.com"
          rows={4}
          value={newRelay}
          onChange={e => setNewRelay(e.target.value)}
        />
        <div>
          <AsyncButton className="secondary" onClick={() => addNewRelay()}>
            <FormattedMessage defaultMessage="Add" />
          </AsyncButton>
        </div>
      </div>
    );
  }

  function myRelays() {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xl font-medium">
          <FormattedMessage defaultMessage="My Relays" />
        </div>
        <small>
          <FormattedMessage defaultMessage="Relays are servers you connect to for sending and receiving events. Aim for 4-8 relays." />
        </small>
        <small>
          <FormattedMessage defaultMessage="The relay name shown is not the same as the full URL entered." />
        </small>
        <table className="table">
          <thead>
            <tr className="uppercase text-neutral-400">
              <th>
                <FormattedMessage defaultMessage="Relay" description="Relay name (URL)" />
              </th>
              <th>
                <FormattedMessage defaultMessage="Status" />
              </th>
              <th>
                <FormattedMessage defaultMessage="Permissions" />
              </th>
              <th>
                <FormattedMessage defaultMessage="Uptime" />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(relays || {}).map(a => (
              <Relay addr={a} key={a} />
            ))}
          </tbody>
        </table>
        <div>
          <AsyncButton onClick={() => saveRelays(system, publisher, relays)} disabled={readonly}>
            <FormattedMessage defaultMessage="Save" />
          </AsyncButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {myRelays()}
      {addRelay()}
      <DiscoverRelays />
    </div>
  );
};

export default RelaySettingsPage;
