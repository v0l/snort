import { FormattedMessage } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";

import ProfilePreview from "@/Components/User/ProfilePreview";
import useRelayState from "@/Feed/RelayState";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { parseId, unwrap } from "@/Utils";
import { removeRelay } from "@/Utils/Login";

import messages from "./messages";

const RelayInfo = () => {
  const params = useParams();
  const navigate = useNavigate();
  const login = useLogin();
  const { system } = useEventPublisher();

  const conn = [...system.pool].find(([, a]) => a.Id === params.id)?.[1];

  const stats = useRelayState(conn?.Address ?? "");
  return (
    <>
      <h3 className="pointer" onClick={() => navigate("/settings/relays")}>
        <FormattedMessage {...messages.Relays} />
      </h3>
      <div>
        <h3>{stats?.Info?.name}</h3>
        <p>{stats?.Info?.description}</p>

        {stats?.Info?.pubkey && (
          <>
            <h4>
              <FormattedMessage {...messages.Owner} />
            </h4>
            <ProfilePreview pubkey={parseId(stats.Info.pubkey)} />
          </>
        )}
        {stats?.Info?.software && (
          <div className="flex">
            <h4 className="grow">
              <FormattedMessage {...messages.Software} />
            </h4>
            <div className="flex flex-col">
              {stats.Info.software.startsWith("http") ? (
                <a href={stats.Info.software} target="_blank" rel="noreferrer">
                  {stats.Info.software}
                </a>
              ) : (
                <>{stats.Info.software}</>
              )}
              <small>
                {!stats.Info.version?.startsWith("v") && "v"}
                {stats.Info.version}
              </small>
            </div>
          </div>
        )}
        {stats?.Info?.contact && (
          <div className="flex">
            <h4 className="grow">
              <FormattedMessage {...messages.Contact} />
            </h4>
            <a
              href={`${stats.Info.contact.startsWith("mailto:") ? "" : "mailto:"}${stats.Info.contact}`}
              target="_blank"
              rel="noreferrer">
              {stats.Info.contact}
            </a>
          </div>
        )}
        {stats?.Info?.supported_nips && (
          <>
            <h4>
              <FormattedMessage {...messages.Supports} />
            </h4>
            <div className="grow">
              {stats.Info?.supported_nips?.map(a => (
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
          {[...(stats?.ActiveRequests ?? [])].map(a => (
            <span className="pill" key={a}>
              {a}
            </span>
          ))}
        </div>
        <h4>
          <FormattedMessage defaultMessage="Pending Subscriptions" id="UDYlxu" />
        </h4>
        <div className="grow">
          {stats?.PendingRequests?.map(a => (
            <span className="pill" key={a.obj[1]}>
              {a.obj[1]}
            </span>
          ))}
        </div>
        <div className="flex mt10 justify-end">
          <div
            className="btn error"
            onClick={() => {
              removeRelay(login, unwrap(conn).Address);
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
