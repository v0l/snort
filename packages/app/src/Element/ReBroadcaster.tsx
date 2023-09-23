import { useContext, useState } from "react";
import { FormattedMessage } from "react-intl";
import { TaggedNostrEvent } from "@snort/system";
import { SnortContext } from "@snort/system-react";

import Modal from "Element/Modal";
import messages from "./messages";
import useLogin from "Hooks/useLogin";
import AsyncButton from "./AsyncButton";

export function ReBroadcaster({ onClose, ev }: { onClose: () => void; ev: TaggedNostrEvent }) {
  const [selected, setSelected] = useState<Array<string>>();
  const system = useContext(SnortContext);
  const { relays } = useLogin(s => ({ relays: s.relays }));

  async function sendReBroadcast() {
    if (selected) {
      await Promise.all(selected.map(r => system.WriteOnceToRelay(r, ev)));
    } else {
      system.BroadcastEvent(ev);
    }
  }

  function renderRelayCustomisation() {
    return (
      <div className="flex-column g8">
        {Object.keys(relays.item || {})
          .filter(el => relays.item[el].write)
          .map((r, i, a) => (
            <div className="card flex f-space">
              <div>{r}</div>
              <div>
                <input
                  type="checkbox"
                  checked={!selected || selected.includes(r)}
                  onChange={e =>
                    setSelected(
                      e.target.checked && selected && selected.length == a.length - 1
                        ? undefined
                        : a.filter(el => (el === r ? e.target.checked : !selected || selected.includes(el))),
                    )
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
        <div className="flex g8">
          <button className="secondary" onClick={onClose}>
            <FormattedMessage {...messages.Cancel} />
          </button>
          <AsyncButton onClick={sendReBroadcast}>
            <FormattedMessage {...messages.ReBroadcast} />
          </AsyncButton>
        </div>
      </Modal>
    </>
  );
}
