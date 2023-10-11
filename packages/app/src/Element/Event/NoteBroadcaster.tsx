import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { removeUndefined } from "@snort/shared";
import { NostrEvent, OkResponse } from "@snort/system";

import AsyncButton from "Element/AsyncButton";
import Icon from "Icons/Icon";
import { getRelayName } from "SnortUtils";
import { System } from "index";

export function NoteBroadcaster({
  evs,
  onClose,
  customRelays,
}: {
  evs: Array<NostrEvent>;
  onClose: () => void;
  customRelays?: Array<string>;
}) {
  const [results, setResults] = useState<Array<OkResponse>>([]);

  async function sendEventToRelays(ev: NostrEvent) {
    if (customRelays) {
      return removeUndefined(
        await Promise.all(
          customRelays.map(async r => {
            try {
              return await System.WriteOnceToRelay(r, ev);
            } catch (e) {
              console.error(e);
            }
          }),
        ),
      );
    } else {
      return await System.BroadcastEvent(ev, r => setResults(x => [...x, r]));
    }
  }

  async function sendNote() {
    const results = await Promise.all(evs.map(a => sendEventToRelays(a)).flat());
    if (results.flat().every(a => a.ok)) {
      onClose();
    }
  }

  useEffect(() => {
    sendNote().catch(console.error);
  }, []);

  return (
    <div className="flex-column g4">
      <h3>
        <FormattedMessage defaultMessage="Sending notes and other stuff" />
      </h3>
      {results
        .filter(a => a.message !== "Duplicate request")
        .sort(a => (a.ok ? -1 : 1))
        .map(r => (
          <div className="p-compact flex-row g16">
            <Icon name={r.ok ? "check" : "x-close"} className={r.ok ? "success" : "error"} />
            <div className="flex-column f-grow g4">
              <b>{getRelayName(r.relay)}</b>
              {r.message && <small>{r.message}</small>}
            </div>
            {!r.ok && false && (
              <div className="flex g8">
                <AsyncButton onClick={() => {}} className="p4 br-compact flex f-center secondary">
                  <Icon name="refresh-ccw-01" />
                </AsyncButton>
                <AsyncButton onClick={() => {}} className="p4 br-compact flex f-center secondary">
                  <Icon name="trash-01" className="trash-icon" />
                </AsyncButton>
              </div>
            )}
          </div>
        ))}
      <div className="flex-row g8">
        <button type="button" onClick={() => onClose()}>
          <FormattedMessage defaultMessage="Close" />
        </button>
      </div>
    </div>
  );
}
