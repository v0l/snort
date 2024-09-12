import { unwrap } from "@snort/shared";
import { EventKind, UnknownTag } from "@snort/system";
import { useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import IconButton from "@/Components/Button/IconButton";
import { CollapsedSection } from "@/Components/Collapsed";
import { RelayFavicon } from "@/Components/Relay/RelaysMetadata";
import useDiscoverMediaServers from "@/Hooks/useDiscoverMediaServers";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { Nip96Uploader } from "@/Utils/Upload/Nip96";

export default function MediaSettingsPage() {
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));
  const { publisher } = useEventPublisher();
  const list = state.getList(EventKind.StorageServerList);
  const [newServer, setNewServer] = useState("");
  const [error, setError] = useState("");
  const knownServers = useDiscoverMediaServers();

  async function validateServer(url: string) {
    if (!publisher) return;

    setError("");
    try {
      const svc = new Nip96Uploader(url, publisher);
      await svc.loadInfo();

      return true;
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
      return false;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xl">
        <FormattedMessage defaultMessage="Media Servers" />
      </div>
      <p>
        <FormattedMessage defaultMessage="Media servers store media which you can share in notes as images and videos" />
      </p>
      <div className="flex flex-col gap-3">
        {list.map(a => {
          const [, addr] = unwrap(a.toEventTag());
          return (
            <div key={addr} className="p br bg-ultradark flex justify-between items-center">
              {addr}
              <IconButton
                icon={{
                  name: "trash",
                  size: 15,
                }}
                onClick={async () => {
                  await state.removeFromList(EventKind.StorageServerList, [new UnknownTag(["server", addr])], true);
                }}
              />
            </div>
          );
        })}
        {list.length === 0 && (
          <small>
            <FormattedMessage defaultMessage="You dont have any media servers, try adding some." />
          </small>
        )}
      </div>
      <div className="p br bg-ultradark flex flex-col gap-2">
        <div className="text-lg">
          <FormattedMessage defaultMessage="Add Server" />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-grow"
            placeholder="https://my-files.com/"
            value={newServer}
            onChange={e => setNewServer(e.target.value)}
          />
          <AsyncButton
            onClick={async () => {
              if (await validateServer(newServer)) {
                await state.addToList(
                  EventKind.StorageServerList,
                  [new UnknownTag(["server", new URL(newServer).toString()])],
                  true,
                );
                setNewServer("");
              }
            }}>
            <FormattedMessage defaultMessage="Add" />
          </AsyncButton>
        </div>
        {error && <b className="text-warning">{error}</b>}
      </div>
      <CollapsedSection
        title={
          <div className="text-xl font-medium">
            <FormattedMessage defaultMessage="Popular Servers" />
          </div>
        }>
        <small>
          <FormattedMessage defaultMessage="Popular media servers." />
        </small>
        <table className="table">
          <thead>
            <tr className="uppercase text-secondary">
              <th>
                <FormattedMessage defaultMessage="Server" />
              </th>
              <th>
                <FormattedMessage defaultMessage="Users" />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(knownServers)
              .sort((a, b) => (b[1] < a[1] ? -1 : 1))
              .filter(([k]) => !list.some(b => b.equals(new UnknownTag(["server", k]))))
              .slice(0, 20)
              .map(([k, v]) => (
                <tr key={k}>
                  <td className="flex gap-2 items-center">
                    <RelayFavicon url={k} />
                    {k}
                  </td>
                  <td className="text-center">
                    <FormattedNumber value={v} />
                  </td>
                  <td className="text-end">
                    <AsyncButton
                      className="!py-1 mb-1"
                      onClick={async () => {
                        if (await validateServer(k)) {
                          await state.addToList(EventKind.StorageServerList, [new UnknownTag(["server", k])], true);
                        }
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
