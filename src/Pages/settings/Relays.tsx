import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Relay from "Element/Relay";
import useEventPublisher from "Feed/EventPublisher";
import { RootState } from "State/Store";
import { RelaySettings } from "Nostr/Connection";
import { setRelays } from "State/Login";

const RelaySettingsPage = () => {
    const dispatch = useDispatch();
    const publisher = useEventPublisher();
    const relays = useSelector<RootState, Record<string, RelaySettings>>(s => s.login.relays);
    const [newRelay, setNewRelay] = useState<string>();

    async function saveRelays() {
        let ev = await publisher.saveRelays();
        publisher.broadcast(ev);
        publisher.broadcastForBootstrap(ev);
    }


    function addRelay() {
        return (
            <>
                <h4>Add Relays</h4>
                <div className="flex mb10">
                    <input type="text" className="f-grow" placeholder="wss://my-relay.com" value={newRelay} onChange={(e) => setNewRelay(e.target.value)} />
                </div>
                <div className="btn mb10" onClick={() => addNewRelay()}>Add</div>
            </>
        )
    }

    function addNewRelay() {
        if ((newRelay?.length ?? 0) > 0) {
            const parsed = new URL(newRelay!);
            const payload = {
                relays: {
                    ...relays,
                    [parsed.toString()]: { read: false, write: false }
                },
                createdAt: Math.floor(new Date().getTime() / 1000)
            };
            dispatch(setRelays(payload))
        }
    }

    return (
        <>
            <h3>Relays</h3>
            <div className="flex f-col">
                {Object.keys(relays || {}).map(a => <Relay addr={a} key={a} />)}
            </div>
            <div className="flex actions">
                <div className="f-grow"></div>
                <div className="btn" onClick={() => saveRelays()}>Save</div>
            </div>
            {addRelay()}
        </>
    )
}

export default RelaySettingsPage;