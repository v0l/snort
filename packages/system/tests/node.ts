import {NostrSystem, SystemInterface} from "..";

const Relay = "wss://relay.snort.social/";

const system = new NostrSystem({}) as SystemInterface;

async function test() {
    await system.ConnectToRelay(Relay, {read: true, write: true});
    setTimeout(() => {
        system.DisconnectRelay(Relay);
    }, 1000);
}

test().catch(console.error);