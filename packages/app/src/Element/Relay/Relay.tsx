import "./Relay.css";
import { useContext, useMemo } from "react";
import FormattedMessage from "Element/FormattedMessage";
import { useNavigate } from "react-router-dom";
import { RelaySettings } from "@snort/system";
import { unixNowMs } from "@snort/shared";

import useRelayState from "Feed/RelayState";
import { SnortContext } from "@snort/system-react";
import { getRelayName, unwrap } from "SnortUtils";
import useLogin from "Hooks/useLogin";
import { setRelays } from "Login";
import Icon from "Icons/Icon";

import messages from "../messages";

export interface RelayProps {
  addr: string;
}

export default function Relay(props: RelayProps) {
  const navigate = useNavigate();
  const system = useContext(SnortContext);
  const login = useLogin();

  const relaySettings = unwrap(
    login.relays.item[props.addr] ?? system.Sockets.find(a => a.address === props.addr)?.settings ?? {},
  );
  const state = useRelayState(props.addr);
  const name = useMemo(() => getRelayName(props.addr), [props.addr]);

  function configure(o: RelaySettings) {
    setRelays(
      login,
      {
        ...login.relays.item,
        [props.addr]: o,
      },
      unixNowMs(),
    );
  }

  return (
    <>
      <div className={`relay w-max`}>
        <div className={`flex ${state?.connected ? "bg-success" : "bg-error"}`}>
          <Icon name="wifi" />
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
                <Icon name={relaySettings.write ? "check" : "close"} size={12} />
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
                <Icon name={relaySettings.read ? "check" : "close"} size={12} />
              </span>
            </div>
          </div>
          <div className="flex">
            <div className="f-grow"></div>
            <div>
              <span className="icon-btn" onClick={() => navigate(state?.id ?? "")}>
                <Icon name="gear" size={12} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
