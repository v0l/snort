import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { TaggedNostrEvent } from "@snort/system";

import useEventPublisher from "Hooks/useEventPublisher";
import Modal from "Element/Modal";
import messages from "./messages";
import useLogin from "Hooks/useLogin";
import { System } from "index";

export function ReBroadcaster({ onClose, ev }: { onClose: () => void, ev: TaggedNostrEvent }) {
  const [selected, setSelected] = useState<Array<string>>();
  const publisher = useEventPublisher();

  async function sendReBroadcast() {
    if (publisher) {
      if (selected) {
        await Promise.all(selected.map(r => System.WriteOnceToRelay(r, ev)));
      } else {
        System.BroadcastEvent(ev);
      }
    }
  }

  function onSubmit(ev: React.MouseEvent<HTMLButtonElement>) {
    ev.stopPropagation();
    sendReBroadcast().catch(console.warn);
  }

  const login = useLogin();
  const relays = login.relays;

  function renderRelayCustomisation() {
    return (
      <div>
        {Object.keys(relays.item || {})
          .filter(el => relays.item[el].write)
          .map((r, i, a) => (
            <div className="card flex">
              <div className="flex f-col f-grow">
                <div>{r}</div>
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={!selected || selected.includes(r)}
                  onChange={e => setSelected(
                    e.target.checked && selected && selected.length == a.length - 1
                      ? undefined
                      : a.filter(el => el === r ? e.target.checked : !selected || selected.includes(el)))
                  }
                />
              </div>
            </div>
          ))}
      </div>
    );
  }

  return (
    <>
      <Modal id="broadcaster" className="note-creator-modal" onClose={onClose}>
        {renderRelayCustomisation()}
        <div className="note-creator-actions">
          <button className="secondary" onClick={onClose}>
            <FormattedMessage {...messages.Cancel} />
          </button>
          <button onClick={onSubmit}>
            <FormattedMessage {...messages.ReBroadcast} />
          </button>
        </div>
      </Modal>
    </>
  );
}
