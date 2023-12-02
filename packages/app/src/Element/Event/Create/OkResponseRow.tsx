import AsyncButton from "@/Element/Button/AsyncButton";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import Icon from "@/Icons/Icon";
import { removeRelay } from "@/Login";
import { saveRelays } from "@/Pages/settings/Relays";
import { getRelayName } from "@/SnortUtils";
import { unwrap, sanitizeRelayUrl } from "@snort/shared";
import { OkResponse } from "@snort/system";
import { useState } from "react";
import { useIntl } from "react-intl";

export function OkResponseRow({ rsp }: { rsp: OkResponse }) {
    const [r, setResult] = useState(rsp);
    const { formatMessage } = useIntl();
    const { publisher, system } = useEventPublisher();
    const login = useLogin();

    async function removeRelayFromResult(r: OkResponse) {
        if (publisher) {
            removeRelay(login, unwrap(sanitizeRelayUrl(r.relay)));
            await saveRelays(system, publisher, login.relays.item);
        }
    }

    async function retryPublish(r: OkResponse) {
        const rsp = await system.WriteOnceToRelay(unwrap(sanitizeRelayUrl(r.relay)), r.event);
        setResult(rsp);
    }

    return <div className="flex items-center g16">
        <Icon name={r.ok ? "check" : "x"} className={r.ok ? "success" : "error"} size={24} />
        <div className="flex flex-col grow g4">
            <b>{getRelayName(r.relay)}</b>
            {r.message && <small>{r.message}</small>}
        </div>
        {!r.ok && (
            <div className="flex g8">
                <AsyncButton
                    onClick={() => retryPublish(r)}
                    className="p4 br-compact flex items-center secondary"
                    title={formatMessage({
                        defaultMessage: "Retry publishing",
                        id: "9kSari",
                    })}>
                    <Icon name="refresh-ccw-01" />
                </AsyncButton>
                <AsyncButton
                    onClick={() => removeRelayFromResult(r)}
                    className="p4 br-compact flex items-center secondary"
                    title={formatMessage({
                        defaultMessage: "Remove from my relays",
                        id: "UJTWqI",
                    })}>
                    <Icon name="trash-01" className="trash-icon" />
                </AsyncButton>
            </div>
        )}
    </div>
}