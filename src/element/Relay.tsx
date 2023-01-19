import "./Relay.css"

import { faPlug, faTrash, faSquareCheck, faSquareXmark, faWifi, faUpload, faDownload, faPlugCircleXmark, faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import useRelayState from "../feed/RelayState";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { removeRelay, setRelays } from "../state/Login";
import { RootState } from "../state/Store";
import { RelaySettings } from "../nostr/Connection";

export interface RelayProps {
    addr: string
}

export default function Relay(props: RelayProps) {
    const dispatch = useDispatch();
    const allRelaySettings = useSelector<RootState, Record<string, RelaySettings>>(s => s.login.relays);
    const relaySettings = allRelaySettings[props.addr];
    const state = useRelayState(props.addr);
    const name = useMemo(() => new URL(props.addr).host, [props.addr]);
    const [showExtra, setShowExtra] = useState(false);

    function configure(o: RelaySettings) {
        dispatch(setRelays({
            relays: {
                ...allRelaySettings,
                [props.addr]: o
            },
            createdAt: Math.floor(new Date().getTime() / 1000)
        }));
    }


    let latency = Math.floor(state?.avgLatency ?? 0);
    return (
        <>
            <div className={`relay w-max`}>
                <div className={`flex ${state?.connected ? "bg-success" : "bg-error"}`}>
                    <FontAwesomeIcon icon={faPlug} />
                </div>
                <div className="f-grow f-col">
                    <div className="flex mb10">
                        <b className="f-2">{name}</b>
                        <div className="f-1">
                            Write
                            <span className="checkmark" onClick={() => configure({ write: !relaySettings.write, read: relaySettings.read })}>
                                <FontAwesomeIcon icon={relaySettings.write ? faSquareCheck : faSquareXmark} />
                            </span>
                        </div>
                        <div className="f-1">
                            Read
                            <span className="checkmark" onClick={() => configure({ write: relaySettings.write, read: !relaySettings.read })}>
                                <FontAwesomeIcon icon={relaySettings.read ? faSquareCheck : faSquareXmark} />
                            </span>
                        </div>
                    </div>
                    <div className="flex">
                        <div className="f-grow">
                            <FontAwesomeIcon icon={faWifi} /> {latency > 2000 ? `${(latency / 1000).toFixed(0)} secs` : `${latency.toLocaleString()} ms`}
                            &nbsp;
                            <FontAwesomeIcon icon={faPlugCircleXmark} /> {state?.disconnects}
                        </div>
                        <div>
                            <span className="icon-btn" onClick={() => setShowExtra(s => !s)}>
                                <FontAwesomeIcon icon={faEllipsisVertical} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {showExtra ? <div className="flex relay-extra w-max">
                <div className="f-1">
                    <FontAwesomeIcon icon={faUpload} /> {state?.events.send}
                </div>
                <div className="f-1">
                    <FontAwesomeIcon icon={faDownload} /> {state?.events.received}
                </div>

                <div className="f-1">
                    Delete
                    <span className="icon-btn" onClick={() => dispatch(removeRelay(props.addr))}>
                        <FontAwesomeIcon icon={faTrash} />
                    </span>
                </div>
            </div> : null}
        </>
    )
}
