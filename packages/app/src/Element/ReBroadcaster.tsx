import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import useEventPublisher from "Feed/EventPublisher";
import Modal from "Element/Modal";
import type { RootState } from "State/Store";
import { setShow, reset, setSelectedCustomRelays } from "State/ReBroadcast";
import messages from "./messages";
import useLogin from "Hooks/useLogin";
import { System } from "index";

export function ReBroadcaster() {
  const publisher = useEventPublisher();
  const { note, show, selectedCustomRelays } = useSelector((s: RootState) => s.reBroadcast);
  const dispatch = useDispatch();

  async function sendReBroadcast() {
    if (note && publisher) {
      if (selectedCustomRelays) selectedCustomRelays.forEach(r => System.WriteOnceToRelay(r, note));
      else System.BroadcastEvent(note);
      dispatch(reset());
    }
  }

  function cancel() {
    dispatch(reset());
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
                  checked={!selectedCustomRelays || selectedCustomRelays.includes(r)}
                  onChange={e =>
                    dispatch(
                      setSelectedCustomRelays(
                        // set false if all relays selected
                        e.target.checked && selectedCustomRelays && selectedCustomRelays.length == a.length - 1
                          ? false
                          : // otherwise return selectedCustomRelays with target relay added / removed
                            a.filter(el =>
                              el === r ? e.target.checked : !selectedCustomRelays || selectedCustomRelays.includes(el),
                            ),
                      ),
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
      {show && (
        <Modal className="note-creator-modal" onClose={() => dispatch(setShow(false))}>
          {renderRelayCustomisation()}
          <div className="note-creator-actions">
            <button className="secondary" onClick={cancel}>
              <FormattedMessage {...messages.Cancel} />
            </button>
            <button onClick={onSubmit}>
              <FormattedMessage {...messages.ReBroadcast} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
