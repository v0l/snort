import { ApiHost, KieranPubKey, SnortPubKey } from "Const";
import ProfilePreview from "Element/ProfilePreview";
import ZapButton from "Element/ZapButton";
import { HexKey } from "Nostr";
import { useEffect, useState } from "react";
import { bech32ToHex } from "Util";

const Developers = [
  bech32ToHex(KieranPubKey), // kieran
  bech32ToHex(
    "npub107jk7htfv243u0x5ynn43scq9wrxtaasmrwwa8lfu2ydwag6cx2quqncxg"
  ), // verbiricha
  bech32ToHex(
    "npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac"
  ), // Karnage
];

const Contributors = [
  bech32ToHex(
    "npub10djxr5pvdu97rjkde7tgcsjxzpdzmdguwacfjwlchvj7t88dl7nsdl54nf"
  ), // ivan
  bech32ToHex(
    "npub148jmlutaa49y5wl5mcll003ftj59v79vf7wuv3apcwpf75hx22vs7kk9ay"
  ), // liran cohen
  bech32ToHex(
    "npub1xdtducdnjerex88gkg2qk2atsdlqsyxqaag4h05jmcpyspqt30wscmntxy"
  ), // artur
  bech32ToHex(
    "npub1vp8fdcyejd4pqjyrjk9sgz68vuhq7pyvnzk8j0ehlljvwgp8n6eqsrnpsw"
  ), // samsamskies
];

interface Splits {
  pubKey: string;
  split: number;
}

interface TotalToday {
  donations: number;
  nip5: number;
}

const DonatePage = () => {
  const [splits, setSplits] = useState<Splits[]>([]);
  const [today, setSumToday] = useState<TotalToday>();

  async function loadData() {
    const rsp = await fetch(`${ApiHost}/api/v1/revenue/splits`);
    if (rsp.ok) {
      setSplits(await rsp.json());
    }
    const rsp2 = await fetch(`${ApiHost}/api/v1/revenue/today`);
    if (rsp2.ok) {
      setSumToday(await rsp2.json());
    }
  }

  useEffect(() => {
    loadData().catch(console.warn);
  }, []);

  function actions(pk: HexKey) {
    const split = splits.find((a) => bech32ToHex(a.pubKey) === pk);
    if (split) {
      return <>{(100 * split.split).toLocaleString()}%</>;
    }
    return <></>;
  }

  return (
    <div className="main-content m5">
      <h2>Help fund the development of Snort</h2>
      <p>
        Snort is an open source project built by passionate people in their free
        time
      </p>
      <p>Your donations are greatly appreciated</p>
      <p>
        Check out the code here:{" "}
        <a
          className="highlight"
          href="https://github.com/v0l/snort"
          rel="noreferrer"
          target="_blank"
        >
          https://github.com/v0l/snort
        </a>
      </p>
      <p>
        Each contributor will get paid a percentage of all donations and NIP-05
        orders, you can see the split amounts below
      </p>
      <div className="flex">
        <div className="mr10">Lightning Donation: </div>
        <ZapButton
          pubkey={bech32ToHex(SnortPubKey)}
          svc={"donate@snort.social"}
        />
      </div>
      {today && (
        <small>
          Total today (UTC): {today.donations.toLocaleString()} sats
        </small>
      )}
      <h3>Primary Developers</h3>
      {Developers.map((a) => (
        <ProfilePreview pubkey={a} key={a} actions={actions(a)} />
      ))}
      <h4>Contributors</h4>
      {Contributors.map((a) => (
        <ProfilePreview pubkey={a} key={a} actions={actions(a)} />
      ))}
    </div>
  );
};

export default DonatePage;
