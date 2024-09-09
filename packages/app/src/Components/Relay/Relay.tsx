import { RelaySettings } from "@snort/system";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import useRelayState from "@/Feed/RelayState";
import useLogin from "@/Hooks/useLogin";
import { getRelayName } from "@/Utils";

import Icon from "../Icons/Icon";

export interface RelayProps {
  addr: string;
}

export default function Relay(props: RelayProps) {
  const navigate = useNavigate();
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));
  const connection = useRelayState(props.addr);

  const settings = state.relays?.find(a => a.url === props.addr)?.settings;
  if (!connection || !settings) return;

  async function configure(o: RelaySettings) {
    await state.updateRelay(props.addr, o);
  }

  const name = connection.info?.name ?? getRelayName(props.addr);
  return (
    <tr>
      <td className="text-ellipsis" title={props.addr}>
        {name.length > 20 ? <>{name.slice(0, 20)}...</> : name}
      </td>
      <td>
        <div className="flex gap-1 items-center">
          <div
            className={classNames("rounded-full w-4 h-4", {
              "bg-success": connection.isOpen,
              "bg-error": !connection.isOpen,
            })}></div>
          {connection.isOpen ? (
            <FormattedMessage defaultMessage="Connected" />
          ) : (
            <FormattedMessage defaultMessage="Offline" />
          )}
        </div>
      </td>
      <td>
        <div className="flex gap-2 cursor-pointer select-none justify-center">
          <div
            className={settings.read ? "" : "text-gray"}
            onClick={() =>
              configure({
                read: !settings.read,
                write: settings.write,
              })
            }>
            <FormattedMessage defaultMessage="Read" />
          </div>
          <div
            className={settings.write ? "" : "text-gray"}
            onClick={() =>
              configure({
                read: settings.read,
                write: !settings.write,
              })
            }>
            <FormattedMessage defaultMessage="Write" />
          </div>
        </div>
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
