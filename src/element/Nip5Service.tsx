import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { ServiceProvider, ServiceConfig, ServiceError, HandleAvailability, ServiceErrorCode } from "../nip05/ServiceProvider";

type Nip05ServiceProps = {
    name: string,
    service: URL | string,
    about: JSX.Element,
    link: string
};

type ReduxStore = any;

export default function Nip5Service(props: Nip05ServiceProps) {
    const pubkey = useSelector<ReduxStore, string>(s => s.login.publicKey);
    const svc = new ServiceProvider(props.service);
    const [serviceConfig, setServiceConfig] = useState<ServiceConfig>();
    const [error, setError] = useState<ServiceError>();
    const [handle, setHandle] = useState<string>("");
    const [domain, setDomain] = useState<string>("");
    const [availabilityResponse, setAvailabilityResponse] = useState<HandleAvailability>();

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
        if(handle.length === 0) {
            setAvailabilityResponse(undefined);
        }
        if (handle && domain) {
            if (!domainConfig?.regex[0].match(handle)) {
                setAvailabilityResponse({ available: false, why: "REGEX" });
                return;
            }
            svc.CheckAvailable(handle, domain)
                .then(a => {
                    if ('error' in a) {
                        setError(a as ServiceError);
                    } else {
                        setAvailabilityResponse(a as HandleAvailability);
                    }
                })
                .catch(console.error);
        }
    }, [handle, domain]);

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
    return (
        <>
            <h3>{props.name}</h3>
            {props.about}
            <p>Find out more info about {props.name} at <a href={props.link} target="_blank" rel="noreferrer">{props.link}</a></p>
            {error && <b className="error">{error.error}</b>}
            <div className="flex mb10">
                <input type="text" placeholder="Handle" value={handle} onChange={(e) => setHandle(e.target.value)} />
                &nbsp;@&nbsp;
                <select value={domain} onChange={(e) => setDomain(e.target.value)}>
                    {serviceConfig?.domains.map(a => <option selected={a.default}>{a.name}</option>)}
                </select>
            </div>
            {availabilityResponse?.available && <div className="flex">
                <div>
                    {availabilityResponse.quote?.price.toLocaleString()} sats
                    &nbsp;
                </div>
                <input type="text" className="f-grow mr10" placeholder="pubkey" value={pubkey} disabled={pubkey ? true : false} />
                <div className="btn">Buy Now</div>
            </div>}
            {availabilityResponse?.available === false && <div className="flex">
                <b className="error">Not available: {mapError(availabilityResponse.why!, availabilityResponse.reasonTag || null)}</b>
            </div>}
        </>
    )
}