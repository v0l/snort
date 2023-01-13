import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    ServiceProvider,
    ServiceConfig,
    ServiceError,
    HandleAvailability,
    ServiceErrorCode,
    HandleRegisterResponse,
    CheckRegisterResponse
} from "../nip05/ServiceProvider";
import AsyncButton from "./AsyncButton";
// @ts-ignore
import LNURLTip from "./LNURLTip";
// @ts-ignore
import Copy from "./Copy";
// @ts-ignore
import useProfile from "../feed/ProfileFeed";
// @ts-ignore
import useEventPublisher from "../feed/EventPublisher";
// @ts-ignore
import { resetProfile } from "../state/Users";
// @ts-ignore
import { hexToBech32 } from "../Util";

type Nip05ServiceProps = {
    name: string,
    service: URL | string,
    about: JSX.Element,
    link: string,
    supportLink: string
};

type ReduxStore = any;

export default function Nip5Service(props: Nip05ServiceProps) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const pubkey = useSelector<ReduxStore, string>(s => s.login.publicKey);
    const user: any = useProfile(pubkey);
    const publisher = useEventPublisher();
    const svc = new ServiceProvider(props.service);
    const [serviceConfig, setServiceConfig] = useState<ServiceConfig>();
    const [error, setError] = useState<ServiceError>();
    const [handle, setHandle] = useState<string>("");
    const [domain, setDomain] = useState<string>("");
    const [availabilityResponse, setAvailabilityResponse] = useState<HandleAvailability>();
    const [registerResponse, setRegisterResponse] = useState<HandleRegisterResponse>();
    const [showInvoice, setShowInvoice] = useState<boolean>(false);
    const [registerStatus, setRegisterStatus] = useState<CheckRegisterResponse>();

    const domainConfig = useMemo(() => serviceConfig?.domains.find(a => a.name === domain), [domain]);

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
    }, [props]);

    useEffect(() => {
        if (handle.length === 0) {
            setAvailabilityResponse(undefined);
        }
        if (handle && domain) {
            let rx = new RegExp(domainConfig?.regex[0] ?? "", domainConfig?.regex[1] ?? "");
            if (!rx.test(handle)) {
                setAvailabilityResponse({ available: false, why: "REGEX" });
                return;
            }
            let t = setTimeout(() => {
                svc.CheckAvailable(handle, domain)
                    .then(a => {
                        if ('error' in a) {
                            setError(a as ServiceError);
                        } else {
                            setAvailabilityResponse(a as HandleAvailability);
                        }
                    })
                    .catch(console.error);
            }, 500);
            return () => clearTimeout(t);
        }
    }, [handle, domain]);

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
    }, [registerResponse, showInvoice])

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
        let newProfile = {
            ...user,
            nip05: `${handle}@${domain}`
        };
        debugger;
        delete newProfile["loaded"];
        delete newProfile["fromEvent"];
        delete newProfile["pubkey"];
        let ev = await publisher.metadata(newProfile);
        dispatch(resetProfile(pubkey));
        publisher.broadcast(ev);
        navigate("/settings");
    }

    return (
        <>
            <h3>{props.name}</h3>
            {props.about}
            <p>Find out more info about {props.name} at <a href={props.link} target="_blank" rel="noreferrer">{props.link}</a></p>
            {error && <b className="error">{error.error}</b>}
            {!registerStatus && <div className="flex mb10">
                <input type="text" placeholder="Handle" value={handle} onChange={(e) => setHandle(e.target.value)} />
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
            <LNURLTip invoice={registerResponse?.invoice} show={showInvoice} onClose={() => setShowInvoice(false)} title={`Buying ${handle}@${domain}`} />
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