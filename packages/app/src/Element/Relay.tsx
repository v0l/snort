import "./Relay.css";
import { useMemo } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlug,
  faSquareCheck,
  faSquareXmark,
  faWifi,
  faPlugCircleXmark,
  faGear,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { RelaySettings } from "@snort/nostr";

import useRelayState from "Feed/RelayState";
import { setRelays } from "State/Login";
import { RootState } from "State/Store";
import { System } from "System";
import { getRelayName, unwrap } from "Util";

import messages from "./messages";

export interface RelayProps {
  addr: string;
}

export default function Relay(props: RelayProps) {
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const allRelaySettings = useSelector<RootState, Record<string, RelaySettings>>(s => s.login.relays);
  const relaySettings = unwrap(allRelaySettings[props.addr] ?? System.Sockets.get(props.addr)?.Settings ?? {});
  const state = useRelayState(props.addr);
  const name = useMemo(() => getRelayName(props.addr), [props.addr]);

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

  const latency = Math.floor(state?.avgLatency ?? 0);
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
              <FormattedMessage {...messages.Write} />
              <span
                className="checkmark"
                onClick={() =>
                  configure({
                    write: !relaySettings.write,
                    read: relaySettings.read,
                  })
                }>
                <FontAwesomeIcon icon={relaySettings.write ? faSquareCheck : faSquareXmark} />
              </span>
            </div>
            <div className="f-1">
              <FormattedMessage {...messages.Read} />
              <span
                className="checkmark"
                onClick={() =>
                  configure({
                    write: relaySettings.write,
                    read: !relaySettings.read,
                  })
                }>
                <FontAwesomeIcon icon={relaySettings.read ? faSquareCheck : faSquareXmark} />
              </span>
            </div>
          </div>
          <div className="flex">
            <div className="f-grow">
              <FontAwesomeIcon icon={faWifi} className="mr5 ml5" />
              {latency > 2000
                ? formatMessage(messages.Seconds, {
                    n: (latency / 1000).toFixed(0),
                  })
                : formatMessage(messages.Milliseconds, {
                    n: latency.toLocaleString(),
                  })}
              &nbsp;
              <FontAwesomeIcon icon={faPlugCircleXmark} className="mr5 ml5" /> {state?.disconnects}
              <FontAwesomeIcon icon={faWarning} className="mr5 ml5" />
              {state?.pendingRequests?.length}
            </div>
            <div>
              <span className="icon-btn" onClick={() => navigate(state?.id ?? "")}>
                <FontAwesomeIcon icon={faGear} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
