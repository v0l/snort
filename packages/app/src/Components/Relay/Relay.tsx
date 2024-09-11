import { Link } from "react-router-dom";

import useRelayState from "@/Feed/RelayState";
import useLogin from "@/Hooks/useLogin";
import { getRelayName } from "@/Utils";

import Icon from "../Icons/Icon";
import RelayPermissions from "./permissions";
import RelayStatusLabel from "./status-label";
import RelayUptime from "./uptime";

export interface RelayProps {
  addr: string;
}

export default function Relay(props: RelayProps) {
  const connection = useRelayState(props.addr);
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));
  if (!connection) return;
  const name = connection.info?.name ?? getRelayName(props.addr);
  return (
    <tr>
      <td className="text-ellipsis" title={props.addr}>
        <Link to={`/settings/relays/${encodeURIComponent(props.addr)}`}>
          {name.length > 20 ? <>{name.slice(0, 20)}...</> : name}
        </Link>
      </td>
      <td>
        <RelayStatusLabel conn={connection} />
      </td>
      <td>
        <RelayPermissions conn={connection} />
      </td>
      <td className="text-center">
        <RelayUptime url={props.addr} />
      </td>
      <td>
        <Icon
          name="trash"
          className="text-gray-light cursor-pointer"
          onClick={() => {
            state.removeRelay(props.addr, true);
          }}
        />
      </td>
    </tr>
  );
}
