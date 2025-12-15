import { OkResponse, TaggedNostrEvent } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { use, useState } from "react";
import { FormattedMessage } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import Modal from "@/Components/Modal/Modal";
import useRelays from "@/Hooks/useRelays";

export function ReBroadcaster({ onClose, ev }: { onClose: () => void; ev: TaggedNostrEvent }) {
  const [selected, setSelected] = useState<Array<string>>();
  const [replies, setReplies] = useState<Array<OkResponse>>([]);
  const [sending, setSending] = useState(false);
  const system = use(SnortContext);
  const relays = useRelays();

  async function sendReBroadcast() {
    setSending(true);
    setReplies([]);
    try {
      if (selected) {
        await Promise.all(selected.map(r => system.WriteOnceToRelay(r, ev).then(o => setReplies(v => [...v, o]))));
      } else {
        const rsp = await system.BroadcastEvent(ev);
        setReplies(rsp);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Modal id="broadcaster" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div className="text-xl font-medium">
            <FormattedMessage defaultMessage="Broadcast Event" />
          </div>
          {Object.keys(relays)
            .filter(el => relays[el].write)
            .map((r, i, a) => (
              <div key={r} className="flex justify-between">
                <div className="flex flex-col gap-1">
                  <div>{r}</div>
                  <small>{replies.findLast(a => a.relay === r)?.message}</small>
                </div>
                <div>
                  <input
                    type="checkbox"
                    disabled={sending}
                    checked={!selected || selected.includes(r)}
                    onChange={e =>
                      setSelected(
                        e.target.checked && selected && selected.length === a.length - 1
                          ? undefined
                          : a.filter(el => (el === r ? e.target.checked : !selected || selected.includes(el))),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          <div className="flex gap-2">
            <button className="secondary" onClick={onClose}>
              <FormattedMessage defaultMessage="Cancel" />
            </button>
            <AsyncButton onClick={sendReBroadcast} disabled={sending}>
              <FormattedMessage defaultMessage="Send" />
            </AsyncButton>
          </div>
        </div>
      </Modal>
    </>
  );
}
