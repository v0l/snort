import { useEffect, useMemo, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ServiceProvider,
  ServiceConfig,
  ServiceError,
  HandleAvailability,
  ServiceErrorCode,
  HandleRegisterResponse,
  CheckRegisterResponse,
} from "Nip05/ServiceProvider";
import AsyncButton from "Element/AsyncButton";
import SendSats from "Element/SendSats";
import Copy from "Element/Copy";
import { useUserProfile } from "Feed/ProfileFeed";
import useEventPublisher from "Feed/EventPublisher";
import { debounce, hexToBech32 } from "Util";
import { UserMetadata } from "Nostr";

import messages from "./messages";

type Nip05ServiceProps = {
  name: string;
  service: URL | string;
  about: JSX.Element;
  link: string;
  supportLink: string;
};

type ReduxStore = any;

export default function Nip5Service(props: Nip05ServiceProps) {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const pubkey = useSelector<ReduxStore, string>((s) => s.login.publicKey);
  const user = useUserProfile(pubkey);
  const publisher = useEventPublisher();
  const svc = useMemo(
    () => new ServiceProvider(props.service),
    [props.service]
  );
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig>();
  const [error, setError] = useState<ServiceError>();
  const [handle, setHandle] = useState<string>("");
  const [domain, setDomain] = useState<string>("");
  const [availabilityResponse, setAvailabilityResponse] =
    useState<HandleAvailability>();
  const [registerResponse, setRegisterResponse] =
    useState<HandleRegisterResponse>();
  const [showInvoice, setShowInvoice] = useState<boolean>(false);
  const [registerStatus, setRegisterStatus] = useState<CheckRegisterResponse>();

  const domainConfig = useMemo(
    () => serviceConfig?.domains.find((a) => a.name === domain),
    [domain, serviceConfig]
  );

  useEffect(() => {
    svc
      .GetConfig()
      .then((a) => {
        if ("error" in a) {
          setError(a as ServiceError);
        } else {
          let svc = a as ServiceConfig;
          setServiceConfig(svc);
          let defaultDomain =
            svc.domains.find((a) => a.default)?.name || svc.domains[0].name;
          setDomain(defaultDomain);
        }
      })
      .catch(console.error);
  }, [props, svc]);

  useEffect(() => {
    setError(undefined);
    setAvailabilityResponse(undefined);
    if (handle && domain) {
      if (handle.length < (domainConfig?.length[0] ?? 2)) {
        setAvailabilityResponse({ available: false, why: "TOO_SHORT" });
        return;
      }
      if (handle.length > (domainConfig?.length[1] ?? 20)) {
        setAvailabilityResponse({ available: false, why: "TOO_LONG" });
        return;
      }
      let rx = new RegExp(
        domainConfig?.regex[0] ?? "",
        domainConfig?.regex[1] ?? ""
      );
      if (!rx.test(handle)) {
        setAvailabilityResponse({ available: false, why: "REGEX" });
        return;
      }
      return debounce(500, () => {
        svc
          .CheckAvailable(handle, domain)
          .then((a) => {
            if ("error" in a) {
              setError(a as ServiceError);
            } else {
              setAvailabilityResponse(a as HandleAvailability);
            }
          })
          .catch(console.error);
      });
    }
  }, [handle, domain, domainConfig, svc]);

  useEffect(() => {
    if (registerResponse && showInvoice) {
      let t = setInterval(async () => {
        let status = await svc.CheckRegistration(registerResponse.token);
        if ("error" in status) {
          setError(status);
          setRegisterResponse(undefined);
          setShowInvoice(false);
        } else {
          let result: CheckRegisterResponse = status;
          if (result.available && result.paid) {
            setShowInvoice(false);
            setRegisterStatus(status);
            setRegisterResponse(undefined);
            setError(undefined);
          }
        }
      }, 2_000);
      return () => clearInterval(t);
    }
  }, [registerResponse, showInvoice, svc]);

  function mapError(e: ServiceErrorCode, t: string | null): string | undefined {
    let whyMap = new Map([
      ["TOO_SHORT", formatMessage(messages.TooShort)],
      ["TOO_LONG", formatMessage(messages.TooLong)],
      ["REGEX", formatMessage(messages.Regex)],
      ["REGISTERED", formatMessage(messages.Registered)],
      ["DISALLOWED_null", formatMessage(messages.Disallowed)],
      ["DISALLOWED_later", formatMessage(messages.DisalledLater)],
    ]);
    return whyMap.get(e === "DISALLOWED" ? `${e}_${t}` : e);
  }

  async function startBuy(handle: string, domain: string) {
    if (registerResponse) {
      setShowInvoice(true);
      return;
    }

    let rsp = await svc.RegisterHandle(handle, domain, pubkey);
    if ("error" in rsp) {
      setError(rsp);
    } else {
      setRegisterResponse(rsp);
      setShowInvoice(true);
    }
  }

  async function updateProfile(handle: string, domain: string) {
    if (user) {
      let newProfile = {
        ...user,
        nip05: `${handle}@${domain}`,
      } as UserMetadata;
      let ev = await publisher.metadata(newProfile);
      publisher.broadcast(ev);
      navigate("/settings");
    }
  }

  return (
    <>
      <h3>{props.name}</h3>
      {props.about}
      <p>
        <FormattedMessage
          {...messages.FindMore}
          values={{
            service: props.name,
            link: (
              <a href={props.link} target="_blank" rel="noreferrer">
                {props.link}
              </a>
            ),
          }}
        />
      </p>
      {error && <b className="error">{error.error}</b>}
      {!registerStatus && (
        <div className="flex mb10">
          <input
            type="text"
            placeholder="Handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
          />
          &nbsp;@&nbsp;
          <select value={domain} onChange={(e) => setDomain(e.target.value)}>
            {serviceConfig?.domains.map((a) => (
              <option key={a.name}>{a.name}</option>
            ))}
          </select>
        </div>
      )}
      {availabilityResponse?.available && !registerStatus && (
        <div className="flex">
          <div className="mr10">
            <FormattedMessage
              {...messages.Sats}
              values={{ n: availabilityResponse.quote?.price }}
            />
            <br />
            <small>{availabilityResponse.quote?.data.type}</small>
          </div>
          <input
            type="text"
            className="f-grow mr10"
            placeholder="pubkey"
            value={hexToBech32("npub", pubkey)}
            disabled
          />
          <AsyncButton onClick={() => startBuy(handle, domain)}>
            <FormattedMessage {...messages.BuyNow} />
          </AsyncButton>
        </div>
      )}
      {availabilityResponse?.available === false && !registerStatus && (
        <div className="flex">
          <b className="error">
            <FormattedMessage {...messages.NotAvailable} />{" "}
            {mapError(
              availabilityResponse.why!,
              availabilityResponse.reasonTag || null
            )}
          </b>
        </div>
      )}
      <SendSats
        invoice={registerResponse?.invoice}
        show={showInvoice}
        onClose={() => setShowInvoice(false)}
        title={formatMessage(messages.Buying, { item: `${handle}@${domain}` })}
      />
      {registerStatus?.paid && (
        <div className="flex f-col">
          <h4>
            <FormattedMessage {...messages.OrderPaid} />
          </h4>
          <p>
            <FormattedMessage {...messages.NewNip} />{" "}
            <code>
              {handle}@{domain}
            </code>
          </p>
          <h3>
            <FormattedMessage {...messages.AccountSupport} />
          </h3>
          <p>
            <FormattedMessage {...messages.SavePassword} />
          </p>
          <Copy text={registerStatus.password} />
          <p>
            <FormattedMessage {...messages.GoTo} />{" "}
            <a href={props.supportLink} target="_blank" rel="noreferrer">
              <FormattedMessage {...messages.AccountPage} />
            </a>
          </p>
          <h4>
            <FormattedMessage {...messages.ActivateNow} />
          </h4>
          <AsyncButton onClick={() => updateProfile(handle, domain)}>
            <FormattedMessage {...messages.AddToProfile} />
          </AsyncButton>
        </div>
      )}
    </>
  );
}
