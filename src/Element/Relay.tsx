import "./Relay.css";

import {
  faPlug,
  faSquareCheck,
  faSquareXmark,
  faWifi,
  faPlugCircleXmark,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import useRelayState from "Feed/RelayState";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setRelays } from "State/Login";
import { RootState } from "State/Store";
import { RelaySettings } from "Nostr/Connection";
import { useNavigate } from "react-router-dom";

export interface RelayProps {
  addr: string;
}

export default function Relay(props: RelayProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const allRelaySettings = useSelector<
    RootState,
    Record<string, RelaySettings>
  >((s) => s.login.relays);
  const relaySettings = allRelaySettings[props.addr];
  const state = useRelayState(props.addr);
  const name = useMemo(() => new URL(props.addr).host, [props.addr]);

  function configure(o: RelaySettings) {
    dispatch(
      setRelays({
        relays: {
          ...allRelaySettings,
          [props.addr]: o,
        },
        createdAt: Math.floor(new Date().getTime() / 1000),
      })
    );
  }

  let latency = Math.floor(state?.avgLatency ?? 0);
  return (
    <>
      <div className={`relay w-max`}>
        <div className={`flex ${state?.connected ? "bg-success" : "bg-error"}`}>
          <FontAwesomeIcon icon={faPlug} />
        </div>
        <div className="f-grow f-col">
          <div className="flex mb10">
            <b className="f-2">{name}</b>
            <div className="f-1">
              Write
              <span
                className="checkmark"
                onClick={() =>
                  configure({
                    write: !relaySettings.write,
                    read: relaySettings.read,
                  })
                }
              >
                <FontAwesomeIcon
                  icon={relaySettings.write ? faSquareCheck : faSquareXmark}
                />
              </span>
            </div>
            <div className="f-1">
              Read
              <span
                className="checkmark"
                onClick={() =>
                  configure({
                    write: relaySettings.write,
                    read: !relaySettings.read,
                  })
                }
              >
                <FontAwesomeIcon
                  icon={relaySettings.read ? faSquareCheck : faSquareXmark}
                />
              </span>
            </div>
          </div>
          <div className="flex">
            <div className="f-grow">
              <FontAwesomeIcon icon={faWifi} />{" "}
              {latency > 2000
                ? `${(latency / 1000).toFixed(0)} secs`
                : `${latency.toLocaleString()} ms`}
              &nbsp;
              <FontAwesomeIcon icon={faPlugCircleXmark} /> {state?.disconnects}
            </div>
            <div>
              <span className="icon-btn" onClick={() => navigate(state!.id)}>
                <FontAwesomeIcon icon={faGear} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
