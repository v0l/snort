import { Connection } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useRelayState from "@/Feed/RelayState";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { parseId, unwrap } from "@/Utils";

import messages from "./messages";

const RelayInfo = () => {
  const params = useParams();
  const navigate = useNavigate();
  const login = useLogin();
  const { system } = useEventPublisher();

  const conn = [...system.pool].find(([, a]) => a.id === params.id)?.[1];

  const stats = useRelayState(conn?.address ?? "");
  return (
    <>
      <h3 className="pointer" onClick={() => navigate("/settings/relays")}>
        <FormattedMessage {...messages.Relays} />
      </h3>
      <div>
        <h3>{stats?.info?.name}</h3>
        <p>{stats?.info?.description}</p>

        {stats?.info?.pubkey && (
          <>
            <h4>
              <FormattedMessage {...messages.Owner} />
            </h4>
            <ProfilePreview pubkey={parseId(stats.info.pubkey)} />
          </>
        )}
        {stats?.info?.software && (
          <div className="flex">
            <h4 className="grow">
              <FormattedMessage {...messages.Software} />
            </h4>
            <div className="flex flex-col">
              {stats.info.software.startsWith("http") ? (
                <a href={stats.info.software} target="_blank" rel="noreferrer">
                  {stats.info.software}
                </a>
              ) : (
                <>{stats.info.software}</>
              )}
              <small>
                {!stats.info.version?.startsWith("v") && "v"}
                {stats.info.version}
              </small>
            </div>
          </div>
        )}
        {stats?.info?.contact && (
          <div className="flex">
            <h4 className="grow">
              <FormattedMessage {...messages.Contact} />
            </h4>
            <a
              href={`${stats.info.contact.startsWith("mailto:") ? "" : "mailto:"}${stats.info.contact}`}
              target="_blank"
              rel="noreferrer">
              {stats.info.contact}
            </a>
          </div>
        )}
        {stats?.info?.supported_nips && (
          <>
            <h4>
              <FormattedMessage {...messages.Supports} />
            </h4>
            <div className="grow">
              {stats.info?.supported_nips?.map(a => (
                <a key={a} target="_blank" rel="noreferrer" href={`https://nips.be/${a}`} className="pill">
                  NIP-{a.toString().padStart(2, "0")}
                </a>
              ))}
            </div>
          </>
        )}
        {conn instanceof Connection && (
          <>
            <h4>
              <FormattedMessage defaultMessage="Active Subscriptions" />
            </h4>
            <div className="grow">
              {conn.ActiveRequests.map(a => (
                <span className="pill" key={a}>
                  {a}
                </span>
              ))}
            </div>
          </>
        )}
        {conn instanceof Connection && (
          <>
            <h4>
              <FormattedMessage defaultMessage="Pending Subscriptions" />
            </h4>
            <div className="grow">
              {conn.PendingRequests.map(a => (
                <span className="pill" key={a.obj[1]}>
                  {a.obj[1]}
                </span>
              ))}
            </div>
          </>
        )}
        <div className="flex mt10 justify-end">
          <AsyncButton
            onClick={async () => {
              await login.state.removeRelay(unwrap(conn).address, true);
              navigate("/settings/relays");
            }}>
            <FormattedMessage {...messages.Remove} />
          </AsyncButton>
        </div>
      </div>
    </>
  );
};

export default RelayInfo;
