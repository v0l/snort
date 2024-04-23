import "./Relay.css";

import { RelaySettings } from "@snort/system";
import classNames from "classnames";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { AsyncIcon } from "@/Components/Button/AsyncIcon";
import useRelayState from "@/Feed/RelayState";
import useLogin from "@/Hooks/useLogin";
import { getRelayName } from "@/Utils";

import { RelayFavicon } from "./RelaysMetadata";

export interface RelayProps {
  addr: string;
}

export default function Relay(props: RelayProps) {
  const navigate = useNavigate();
  const state = useLogin(s => s.state);

  const name = useMemo(() => getRelayName(props.addr), [props.addr]);
  const connection = useRelayState(props.addr);

  const relaySettings = state.relays?.find(a => a.url === props.addr)?.settings;
  if (!relaySettings || !connection) return;

  async function configure(o: RelaySettings) {
    await state.updateRelay(props.addr, o);
  }

  return (
    <>
      <div className="relay bg-dark">
        <div className={classNames("flex items-center", connection.isOpen ? "bg-success" : "bg-error")}>
          <RelayFavicon url={props.addr} />
        </div>
        <div className="flex flex-col g8">
          <div>
            <b>{name}</b>
          </div>
          {!connection?.ephemeral && (
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
                onClick={() => state.removeRelay(props.addr)}
              />
              <AsyncIcon
                iconName="gear"
                iconSize={16}
                className="button-icon-sm transparent"
                onClick={() => navigate(connection?.id ?? "")}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
