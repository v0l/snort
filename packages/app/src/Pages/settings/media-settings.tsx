import { unwrap } from "@snort/shared";
import { EventKind, UnknownTag } from "@snort/system";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import IconButton from "@/Components/Button/IconButton";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { Nip96Uploader } from "@/Utils/Upload/Nip96";

export default function MediaSettingsPage() {
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));
  const { publisher } = useEventPublisher();
  const list = state.getList(EventKind.StorageServerList);
  const [newServer, setNewServer] = useState("");
  const [error, setError] = useState("");

  async function validateServer() {
    if (!publisher) return;

    setError("");
    try {
      const svc = new Nip96Uploader(newServer, publisher);
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
              if (await validateServer()) {
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
    </div>
  );
}
