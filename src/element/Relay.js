import "./Relay.css"

import { faPlug, faTrash, faSquareCheck, faSquareXmark } from "@fortawesome/free-solid-svg-icons";
import useRelayState from "../feed/RelayState";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { removeRelay, setRelays } from "../state/Login";


export default function Relay(props) {
    const dispatch = useDispatch();
    const relaySettings = useSelector(s => s.login.relays[props.addr]);
    const state = useRelayState(props.addr);
    const name = useMemo(() => new URL(props.addr).host, [props.addr]);

    function configure(o) {
        dispatch(setRelays({
            [props.addr]: o
        }));
    }

    return (
        <>
            <div className="flex relay w-max">
                <div>
                    <FontAwesomeIcon icon={faPlug} color={state?.connected ? "green" : "red"} />
                </div>
                <div className="f-grow f-col">
                    <b>{name}</b>
                    <div>
                        Write
                        <span className="pill" onClick={() => configure({ write: !relaySettings.write, read: relaySettings.read })}>
                            <FontAwesomeIcon icon={relaySettings.write ? faSquareCheck : faSquareXmark} />
                        </span>
                        Read
                        <span className="pill" onClick={() => configure({ write: relaySettings.write, read: !relaySettings.read })}>
                            <FontAwesomeIcon icon={relaySettings.read ? faSquareCheck : faSquareXmark} />
                        </span>
                    </div>
                </div>
                <div>
                    <span className="pill">
                        <FontAwesomeIcon icon={faTrash} onClick={() => dispatch(removeRelay(props.addr))} />
                    </span>
                </div>
            </div>
        </>
    )
}