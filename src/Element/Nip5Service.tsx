import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    ServiceProvider,
    ServiceConfig,
    ServiceError,
    HandleAvailability,
    ServiceErrorCode,
    HandleRegisterResponse,
    CheckRegisterResponse
} from "Nip05/ServiceProvider";
import AsyncButton from "Element/AsyncButton";
import LNURLTip from "Element/LNURLTip";
import Copy from "Element/Copy";
import { useUserProfile }from "Feed/ProfileFeed";
import useEventPublisher from "Feed/EventPublisher";
import { debounce, hexToBech32 } from "Util";
import { UserMetadata } from "Nostr";

type Nip05ServiceProps = {
    name: string,
    service: URL | string,
    about: JSX.Element,
    link: string,
    supportLink: string
};

type ReduxStore = any;

export default function Nip5Service(props: Nip05ServiceProps) {
    const navigate = useNavigate();
    const pubkey = useSelector<ReduxStore, string>(s => s.login.publicKey);
    const user = useUserProfile(pubkey);
    const publisher = useEventPublisher();
    const svc = useMemo(() => new ServiceProvider(props.service), [props.service]);
    const [serviceConfig, setServiceConfig] = useState<ServiceConfig>();
    const [error, setError] = useState<ServiceError>();
    const [handle, setHandle] = useState<string>("");
    const [domain, setDomain] = useState<string>("");
    const [availabilityResponse, setAvailabilityResponse] = useState<HandleAvailability>();
    const [registerResponse, setRegisterResponse] = useState<HandleRegisterResponse>();
    const [showInvoice, setShowInvoice] = useState<boolean>(false);
    const [registerStatus, setRegisterStatus] = useState<CheckRegisterResponse>();

    const domainConfig = useMemo(() => serviceConfig?.domains.find(a => a.name === domain), [domain, serviceConfig]);

    useEffect(() => {
        svc.GetConfig()
            .then(a => {
                if ('error' in a) {
                    setError(a as ServiceError)
                } else {
                    let svc = a as ServiceConfig;
                    setServiceConfig(svc);
                    let defaultDomain = svc.domains.find(a => a.default)?.name || svc.domains[0].name;
                    setDomain(defaultDomain);
                }
            })
            .catch(console.error)
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
            let rx = new RegExp(domainConfig?.regex[0] ?? "", domainConfig?.regex[1] ?? "");
            if (!rx.test(handle)) {
                setAvailabilityResponse({ available: false, why: "REGEX" });
                return;
            }
            return debounce(500, () => {
                svc.CheckAvailable(handle, domain)
                    .then(a => {
                        if ('error' in a) {
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
                if ('error' in status) {
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
    }, [registerResponse, showInvoice, svc])

    function mapError(e: ServiceErrorCode, t: string | null): string | undefined {
        let whyMap = new Map([
            ["TOO_SHORT", "name too short"],
            ["TOO_LONG", "name too long"],
            ["REGEX", "name has disallowed characters"],
            ["REGISTERED", "name is registered"],
            ["DISALLOWED_null", "name is blocked"],
            ["DISALLOWED_later", "name will be available later"],
        ]);
        return whyMap.get(e === "DISALLOWED" ? `${e}_${t}` : e);
    }

    async function startBuy(handle: string, domain: string) {
        if (registerResponse) {
            setShowInvoice(true);
            return;
        }

        let rsp = await svc.RegisterHandle(handle, domain, pubkey);
        if ('error' in rsp) {
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
                nip05: `${handle}@${domain}`
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
            <p>Find out more info about {props.name} at <a href={props.link} target="_blank" rel="noreferrer">{props.link}</a></p>
            {error && <b className="error">{error.error}</b>}
            {!registerStatus && <div className="flex mb10">
                <input type="text" placeholder="Handle" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} />
                &nbsp;@&nbsp;
                <select value={domain} onChange={(e) => setDomain(e.target.value)}>
                    {serviceConfig?.domains.map(a => <option key={a.name}>{a.name}</option>)}
                </select>
            </div>}
            {availabilityResponse?.available && !registerStatus && <div className="flex">
                <div className="mr10">
                    {availabilityResponse.quote?.price.toLocaleString()} sats<br />
                    <small>{availabilityResponse.quote?.data.type}</small>
                </div>
                <input type="text" className="f-grow mr10" placeholder="pubkey" value={hexToBech32("npub", pubkey)} disabled />
                <AsyncButton onClick={() => startBuy(handle, domain)}>Buy Now</AsyncButton>
            </div>}
            {availabilityResponse?.available === false && !registerStatus && <div className="flex">
                <b className="error">Not available: {mapError(availabilityResponse.why!, availabilityResponse.reasonTag || null)}</b>
            </div>}
            <LNURLTip
                invoice={registerResponse?.invoice}
                show={showInvoice}
                onClose={() => setShowInvoice(false)}
                title={`Buying ${handle}@${domain}`} />
            {registerStatus?.paid && <div className="flex f-col">
                <h4>Order Paid!</h4>
                <p>Your new NIP-05 handle is: <code>{handle}@{domain}</code></p>
                <h3>Account Support</h3>
                <p>Please make sure to save the following password in order to manage your handle in the future</p>
                <Copy text={registerStatus.password} />
                <p>Go to <a href={props.supportLink} target="_blank" rel="noreferrer">account page</a></p>
                <h4>Activate Now</h4>
                <AsyncButton onClick={() => updateProfile(handle, domain)}>Add to Profile</AsyncButton>
            </div>}
        </>
    )
}
