import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { unwrap } from "Util";
import { formatShort } from "Number";
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
import { debounce } from "Util";
import { UserMetadata } from "@snort/nostr";

import messages from "./messages";
import { RootState } from "State/Store";

type Nip05ServiceProps = {
  name: string;
  service: URL | string;
  about: JSX.Element;
  link: string;
  supportLink: string;
  helpText?: boolean;
  onChange?(h: string): void;
  onSuccess?(h: string): void;
};

export default function Nip5Service(props: Nip05ServiceProps) {
  const navigate = useNavigate();
  const { helpText = true } = props;
  const { formatMessage } = useIntl();
  const pubkey = useSelector((s: RootState) => s.login.publicKey);
  const user = useUserProfile(pubkey);
  const publisher = useEventPublisher();
  const svc = useMemo(() => new ServiceProvider(props.service), [props.service]);
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig>();
  const [error, setError] = useState<ServiceError>();
  const [handle, setHandle] = useState<string>("");
  const [domain, setDomain] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [availabilityResponse, setAvailabilityResponse] = useState<HandleAvailability>();
  const [registerResponse, setRegisterResponse] = useState<HandleRegisterResponse>();
  const [showInvoice, setShowInvoice] = useState<boolean>(false);
  const [registerStatus, setRegisterStatus] = useState<CheckRegisterResponse>();

  const onHandleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const h = e.target.value.toLowerCase();
    setHandle(h);
    if (props.onChange) {
      props.onChange(`${h}@${domain}`);
    }
  };

  const onDomainChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const d = e.target.value;
    setDomain(d);
    if (props.onChange) {
      props.onChange(`${handle}@${d}`);
    }
  };

  const domainConfig = useMemo(() => serviceConfig?.domains.find(a => a.name === domain), [domain, serviceConfig]);

  useEffect(() => {
    svc
      .GetConfig()
      .then(a => {
        if ("error" in a) {
          setError(a as ServiceError);
        } else {
          const svc = a as ServiceConfig;
          setServiceConfig(svc);
          const defaultDomain = svc.domains.find(a => a.default)?.name || svc.domains[0].name;
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
      const rx = new RegExp(domainConfig?.regex[0] ?? "", domainConfig?.regex[1] ?? "");
      if (!rx.test(handle)) {
        setAvailabilityResponse({ available: false, why: "REGEX" });
        return;
      }
      return debounce(500, () => {
        svc
          .CheckAvailable(handle, domain)
          .then(a => {
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

  async function checkRegistration(rsp: HandleRegisterResponse) {
    const status = await svc.CheckRegistration(rsp.token);
    if ("error" in status) {
      setError(status);
      setRegisterResponse(undefined);
      setShowInvoice(false);
    } else {
      const result: CheckRegisterResponse = status;
      if (result.paid) {
        if (!result.available) {
          setError({
            error: "REGISTERED",
          } as ServiceError);
        } else {
          setError(undefined);
        }
        setShowInvoice(false);
        setRegisterStatus(status);
        setRegisterResponse(undefined);
      }
    }
  }

  useEffect(() => {
    if (registerResponse && showInvoice && !checking) {
      const t = setInterval(() => {
        if (!checking) {
          setChecking(true);
          checkRegistration(registerResponse)
            .then(() => setChecking(false))
            .catch(e => {
              console.error(e);
              setChecking(false);
            });
        }
      }, 2_000);
      return () => clearInterval(t);
    }
  }, [registerResponse, showInvoice, svc, checking]);

  function mapError(e: ServiceErrorCode | undefined, t: string | null): string | undefined {
    if (e === undefined) {
      return undefined;
    }
    const whyMap = new Map([
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
    if (!pubkey) {
      return;
    }

    const rsp = await svc.RegisterHandle(handle, domain, pubkey);
    if ("error" in rsp) {
      setError(rsp);
    } else {
      setRegisterResponse(rsp);
      setShowInvoice(true);
    }
  }

  async function updateProfile(handle: string, domain: string) {
    if (user) {
      const nip05 = `${handle}@${domain}`;
      const newProfile = {
        ...user,
        nip05,
      } as UserMetadata;
      const ev = await publisher.metadata(newProfile);
      publisher.broadcast(ev);
      if (props.onSuccess) {
        props.onSuccess(nip05);
      }
      if (helpText) {
        navigate("/settings");
      }
    }
  }

  return (
    <>
      {helpText && <h3>{props.name}</h3>}
      {helpText && props.about}
      {helpText && (
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
      )}
      {error && <b className="error">{error.error}</b>}
      {!registerStatus && (
        <div className="flex mb10">
          <input type="text" placeholder={formatMessage(messages.Handle)} value={handle} onChange={onHandleChange} />
          &nbsp;@&nbsp;
          <select value={domain} onChange={onDomainChange}>
            {serviceConfig?.domains.map(a => (
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
              values={{ n: formatShort(unwrap(availabilityResponse.quote?.price)) }}
            />
            <br />
            <small>{availabilityResponse.quote?.data.type}</small>
          </div>
          <AsyncButton onClick={() => startBuy(handle, domain)}>
            <FormattedMessage {...messages.BuyNow} />
          </AsyncButton>
        </div>
      )}
      {availabilityResponse?.available === false && !registerStatus && (
        <div className="flex">
          <b className="error">
            <FormattedMessage {...messages.NotAvailable} />{" "}
            {mapError(availabilityResponse.why, availabilityResponse.reasonTag || null)}
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
