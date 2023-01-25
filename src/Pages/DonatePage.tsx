import { ApiHost } from "Const";
import ProfilePreview from "Element/ProfilePreview";
import ZapButton from "Element/ZapButton";
import { HexKey } from "Nostr";
import { useEffect, useState } from "react";
import { bech32ToHex } from "Util";

const Developers = [
    bech32ToHex("npub1v0lxxxxutpvrelsksy8cdhgfux9l6a42hsj2qzquu2zk7vc9qnkszrqj49"), // kieran
    bech32ToHex("npub107jk7htfv243u0x5ynn43scq9wrxtaasmrwwa8lfu2ydwag6cx2quqncxg"), // verbiricha
    bech32ToHex("npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac"), // Karnage
];

const Contributors = [
    bech32ToHex("npub10djxr5pvdu97rjkde7tgcsjxzpdzmdguwacfjwlchvj7t88dl7nsdl54nf"), // ivan
    bech32ToHex("npub148jmlutaa49y5wl5mcll003ftj59v79vf7wuv3apcwpf75hx22vs7kk9ay"), // liran cohen
];

interface Splits {
    pubKey: string,
    split: number
}

const DonatePage = () => {
    const [splits, setSplits] = useState<Splits[]>([]);

    async function loadSplits() {
        let rsp = await fetch(`${ApiHost}/api/v1/revenue/splits`);
        if(rsp.ok) {
            setSplits(await rsp.json());
        }
    }

    useEffect(() => {
        loadSplits().catch(console.warn);
    }, []);

    function actions(pk: HexKey) {
        let split = splits.find(a => bech32ToHex(a.pubKey) === pk);
        if(split) {
            return <>{(100 * split.split).toLocaleString()}%</>
        }
        return <></>
    }
    
    return (
        <div className="main-content m5">
            <h2>Help fund the development of Snort</h2>
            <p>
                Snort is an open source project built by passionate people in their free time
            </p>
            <p>
                Your donations are greatly appreciated
            </p>
            <p>
                Check out the code here: <a className="highlight" href="https://github.com/v0l/snort" rel="noreferrer" target="_blank">https://github.com/v0l/snort</a>
            </p>
            <p>
                Each contributor will get paid a percentage of all donations and NIP-05 orders, you can see the split amounts below
            </p>
            <div className="flex">
                <div className="mr10">Lightning Donation: </div>
                <ZapButton svc={"donate@snort.social"} />
            </div>
            <h3>Primary Developers</h3>
            {Developers.map(a => <ProfilePreview pubkey={a} key={a} actions={actions(a)} />)}
            <h4>Contributors</h4>
            {Contributors.map(a => <ProfilePreview pubkey={a} key={a} actions={actions(a)} />)}
        </div>
    );
}

export default DonatePage;
