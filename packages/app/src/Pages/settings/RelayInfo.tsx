import { FormattedMessage } from "react-intl";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useRelayState from "@/Feed/RelayState";
import { useNavigate, useParams } from "react-router-dom";
import { parseId, unwrap } from "@/Utils";
import { removeRelay } from "@/Utils/Login";
import useLogin from "@/Hooks/useLogin";

import messages from "./messages";
import useEventPublisher from "@/Hooks/useEventPublisher";

const RelayInfo = () => {
  const params = useParams();
  const navigate = useNavigate();
  const login = useLogin();
  const { system } = useEventPublisher();

  const conn = system.Sockets.find(a => a.id === params.id);
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
              {stats.info.supported_nips.map(a => (
                <a key={a} target="_blank" rel="noreferrer" href={`https://nips.be/${a}`} className="pill">
                  NIP-{a.toString().padStart(2, "0")}
                </a>
              ))}
            </div>
          </>
        )}
        <h4>
          <FormattedMessage defaultMessage="Active Subscriptions" id="p85Uwy" />
        </h4>
        <div className="grow">
          {stats?.activeRequests.map(a => (
            <span className="pill" key={a}>
              {a}
            </span>
          ))}
        </div>
        <h4>
          <FormattedMessage defaultMessage="Pending Subscriptions" id="UDYlxu" />
        </h4>
        <div className="grow">
          {stats?.pendingRequests.map(a => (
            <span className="pill" key={a}>
              {a}
            </span>
          ))}
        </div>
        <div className="flex mt10 justify-end">
          <div
            className="btn error"
            onClick={() => {
              removeRelay(login, unwrap(conn).address);
              navigate("/settings/relays");
            }}>
            <FormattedMessage {...messages.Remove} />
          </div>
        </div>
      </div>
    </>
  );
};

export default RelayInfo;
