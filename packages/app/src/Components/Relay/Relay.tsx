import "./Relay.css";

import { unixNowMs } from "@snort/shared";
import { RelaySettings } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import classNames from "classnames";
import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { AsyncIcon } from "@/Components/Button/AsyncIcon";
import useRelayState from "@/Feed/RelayState";
import useLogin from "@/Hooks/useLogin";
import { getRelayName, unwrap } from "@/Utils";
import { removeRelay, setRelays } from "@/Utils/Login";

import { RelayFavicon } from "./RelaysMetadata";

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
      <div className="relay bg-dark">
        <div className={classNames("flex items-center", state?.connected ? "bg-success" : "bg-error")}>
          <RelayFavicon url={props.addr} />
        </div>
        <div className="flex flex-col g8">
          <div>
            <b>{name}</b>
          </div>
          {!state?.ephemeral && (
            <div className="flex g8">
              <AsyncIcon
                iconName="write"
                iconSize={16}
                className={classNames("button-icon-sm transparent", { active: relaySettings.write })}
                onClick={() =>
                  configure({
                    write: !relaySettings.write,
                    read: relaySettings.read,
                  })
                }
              />
              <AsyncIcon
                iconName="read"
                iconSize={16}
                className={classNames("button-icon-sm transparent", { active: relaySettings.read })}
                onClick={() =>
                  configure({
                    write: relaySettings.write,
                    read: !relaySettings.read,
                  })
                }
              />
              <AsyncIcon
                iconName="trash"
                iconSize={16}
                className="button-icon-sm transparent trash-icon"
                onClick={() => removeRelay(login, props.addr)}
              />
              <AsyncIcon
                iconName="gear"
                iconSize={16}
                className="button-icon-sm transparent"
                onClick={() => navigate(state?.id ?? "")}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
