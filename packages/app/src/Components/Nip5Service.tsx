import { mapEventToProfile,UserMetadata } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { ChangeEvent,useEffect, useMemo, useState } from "react";
import { FormattedMessage,useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import { UserCache } from "@/Cache";
import AsyncButton from "@/Components/Button/AsyncButton";
import Copy from "@/Components/Copy/Copy";
import SendSats from "@/Components/SendSats/SendSats";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { unwrap } from "@/Utils";
import { debounce } from "@/Utils";
import {
  CheckRegisterResponse,
  HandleAvailability,
  HandleRegisterResponse,
  ServiceConfig,
  ServiceError,
  ServiceErrorCode,
  ServiceProvider,
} from "@/Utils/Nip05/ServiceProvider";
import SnortServiceProvider from "@/Utils/Nip05/SnortServiceProvider";
import { formatShort } from "@/Utils/Number";

import messages from "./messages";

type Nip05ServiceProps = {
  name: string;
  service: URL | string;
  about: JSX.Element;
  link: string;
  supportLink: string;
  helpText?: boolean;
  forSubscription?: string;
  onChange?(h: string): void;
  onSuccess?(h: string): void;
};

export default function Nip5Service(props: Nip05ServiceProps) {
  const navigate = useNavigate();
  const { helpText = true } = props;
  const { formatMessage } = useIntl();
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  const user = useUserProfile(publicKey);
  const { publisher, system } = useEventPublisher();
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
    if (!publicKey) {
      return;
    }

    const rsp = await svc.RegisterHandle(handle, domain, publicKey);
    if ("error" in rsp) {
      setError(rsp);
    } else {
      setRegisterResponse(rsp);
      setShowInvoice(true);
    }
  }

  async function claimForSubscription(handle: string, domain: string, sub: string) {
    if (!publicKey || !publisher) {
      return;
    }

    const svcEx = new SnortServiceProvider(publisher, props.service);
    const rsp = await svcEx.registerForSubscription(handle, domain, sub);
    if ("error" in rsp) {
      setError(rsp);
    } else {
      if (props.onSuccess) {
        const nip05 = `${handle}@${domain}`;
        props.onSuccess(nip05);
      }
    }
  }
  async function updateProfile(handle: string, domain: string) {
    if (user && publisher) {
      const nip05 = `${handle}@${domain}`;
      const newProfile = {
        ...user,
        nip05,
      } as UserMetadata;
      const ev = await publisher.metadata(newProfile);
      system.BroadcastEvent(ev);
      if (props.onSuccess) {
        props.onSuccess(nip05);
      }
      const newMeta = mapEventToProfile(ev);
      if (newMeta) {
        UserCache.set(newMeta);
      }
      if (helpText) {
        navigate("/settings/profile");
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
        <div className="flex items-center mb10">
          <input
            type="text"
            className="nip-handle"
            placeholder={formatMessage(messages.Handle)}
            value={handle}
            onChange={onHandleChange}
          />
          &nbsp;@&nbsp;
          <select value={domain} onChange={onDomainChange}>
            {serviceConfig?.domains.map(a => <option key={a.name}>{a.name}</option>)}
          </select>
        </div>
      )}
      {availabilityResponse?.available && !registerStatus && (
        <div className="flex">
          {!props.forSubscription && (
            <div className="mr10">
              <FormattedMessage
                {...messages.Sats}
                values={{ n: formatShort(unwrap(availabilityResponse.quote?.price)) }}
              />
              <br />
              <small>{availabilityResponse.quote?.data.type}</small>
            </div>
          )}
          <AsyncButton
            onClick={() =>
              props.forSubscription
                ? claimForSubscription(handle, domain, props.forSubscription)
                : startBuy(handle, domain)
            }>
            {props.forSubscription ? (
              <FormattedMessage defaultMessage="Claim Now" id="FdhSU2" />
            ) : (
              <FormattedMessage {...messages.BuyNow} />
            )}
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
        <div className="flex flex-col">
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
