import { ApiHost, KieranPubKey, SnortPubKey } from "Const";
import ProfilePreview from "Element/ProfilePreview";
import ZapButton from "Element/ZapButton";
import { HexKey } from "@snort/nostr";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { bech32ToHex } from "Util";

const Developers = [
  bech32ToHex(KieranPubKey), // kieran
  bech32ToHex("npub107jk7htfv243u0x5ynn43scq9wrxtaasmrwwa8lfu2ydwag6cx2quqncxg"), // verbiricha
  bech32ToHex("npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac"), // Karnage
];

const Contributors = [
  bech32ToHex("npub10djxr5pvdu97rjkde7tgcsjxzpdzmdguwacfjwlchvj7t88dl7nsdl54nf"), // ivan
  bech32ToHex("npub148jmlutaa49y5wl5mcll003ftj59v79vf7wuv3apcwpf75hx22vs7kk9ay"), // liran cohen
  bech32ToHex("npub1xdtducdnjerex88gkg2qk2atsdlqsyxqaag4h05jmcpyspqt30wscmntxy"), // artur
  bech32ToHex("npub1vp8fdcyejd4pqjyrjk9sgz68vuhq7pyvnzk8j0ehlljvwgp8n6eqsrnpsw"), // samsamskies
  bech32ToHex("npub179rec9sw2a5ngkr2wsjpjhwp2ksygjxn6uw5py9daj2ezhw3aw5swv3s6q"), // h3y6e - JA + other stuff
  bech32ToHex("npub17q5n2z8naw0xl6vu9lvt560lg33pdpe29k0k09umlfxm3vc4tqrq466f2y"), // w3irdrobot
];

const Translators = [
  bech32ToHex("npub1s8zws5frm94esxnp9v6zf7vk60m3hum3305n78sr73t78kleus7q8zpwna"), // middlingphys - JA
  bech32ToHex("npub1z0ykz6lp3y8rjjntenns0ee02062g2f0n55u49w44xdemw35vcpsda5jhh"), // noraglyphs - JA
  bech32ToHex("npub13wa880se2h3l54k7x76edrkrt4p94sh4q090974mt0z6n09qtntqxp47uk"), // numpad0 - JA
  bech32ToHex("npub147ccm75um0zkn0lr9fg9wrag2g6yxfw234fpmhdwuvaqjyegrhgs46t2td"), // ROBO358 - JA

  bech32ToHex("npub1ww8kjxz2akn82qptdpl7glywnchhkx3x04hez3d3rye397turrhssenvtp"), // Zoltan - HU

  bech32ToHex("npub1x8dzy9xegwmdk2vy30l8u08caspcqq2yzncxehdsa6kvnte9pr3qnt8pg4"), // solobalbo - FR

  bech32ToHex("npub1xwm9svxrlymymph0hka40zw9frg98m6adxmzcq26jhtm5gwlhjrshhgzfd"), // meitsjustme - ZH

  bech32ToHex("npub13tkge7eqeem5cz8gk7gdju76nytvvf064hm5mzmv3x26k2uvaxfqczet2j"), // Mendace - IT

  bech32ToHex("npub10529hxckjm5t5mchss5lnpsqrmavulglxhrmu5quuu4hs6yuyh3qc9gxd5"), // aadbitcoin - ID
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
    const split = splits.find(a => bech32ToHex(a.pubKey) === pk);
    if (split) {
      return <>{(100 * split.split).toLocaleString()}%</>;
    }
    return <></>;
  }

  return (
    <div className="main-content m5">
      <h2>
        <FormattedMessage defaultMessage="Help fund the development of Snort" />
      </h2>
      <p>
        <FormattedMessage defaultMessage="Snort is an open source project built by passionate people in their free time" />
      </p>
      <p>
        <FormattedMessage defaultMessage="Your donations are greatly appreciated" />
      </p>
      <p>
        <FormattedMessage
          defaultMessage={"Check out the code here: {link}"}
          values={{
            link: (
              <a className="highlight" href="https://github.com/v0l/snort" rel="noreferrer" target="_blank">
                https://github.com/v0l/snort
              </a>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage defaultMessage="Each contributor will get paid a percentage of all donations and NIP-05 orders, you can see the split amounts below" />
      </p>
      <div className="flex">
        <div className="mr10">
          <FormattedMessage defaultMessage="Lightning Donation: " />
        </div>
        <ZapButton pubkey={bech32ToHex(SnortPubKey)} lnurl={"donate@snort.social"} />
      </div>
      {today && (
        <small>
          <FormattedMessage
            defaultMessage="Total today (UTC): {amount} sats"
            values={{ amount: today.donations.toLocaleString() }}
          />
        </small>
      )}
      <h3>
        <FormattedMessage defaultMessage="Primary Developers" />
      </h3>
      {Developers.map(a => (
        <ProfilePreview pubkey={a} key={a} actions={actions(a)} />
      ))}
      <h4>
        <FormattedMessage defaultMessage="Contributors" />
      </h4>
      {Contributors.map(a => (
        <ProfilePreview pubkey={a} key={a} actions={actions(a)} />
      ))}
      <h4>
        <FormattedMessage defaultMessage="Translators" />
      </h4>
      {Translators.map(a => (
        <ProfilePreview pubkey={a} key={a} actions={actions(a)} />
      ))}
    </div>
  );
};

export default DonatePage;
