import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { HexKey } from "@snort/system";

import { ApiHost, DeveloperAccounts, SnortPubKey } from "Const";
import ProfilePreview from "Element/User/ProfilePreview";
import ZapButton from "Element/Event/ZapButton";
import { bech32ToHex } from "SnortUtils";
import SnortApi, { RevenueSplit, RevenueToday } from "External/SnortApi";
import Modal from "Element/Modal";
import AsyncButton from "Element/AsyncButton";
import QrCode from "Element/QrCode";
import Copy from "Element/Copy";

const Contributors = [
  bech32ToHex("npub10djxr5pvdu97rjkde7tgcsjxzpdzmdguwacfjwlchvj7t88dl7nsdl54nf"), // ivan
  bech32ToHex("npub148jmlutaa49y5wl5mcll003ftj59v79vf7wuv3apcwpf75hx22vs7kk9ay"), // liran cohen
  bech32ToHex("npub1xdtducdnjerex88gkg2qk2atsdlqsyxqaag4h05jmcpyspqt30wscmntxy"), // artur
  bech32ToHex("npub1vp8fdcyejd4pqjyrjk9sgz68vuhq7pyvnzk8j0ehlljvwgp8n6eqsrnpsw"), // samsamskies
  bech32ToHex("npub179rec9sw2a5ngkr2wsjpjhwp2ksygjxn6uw5py9daj2ezhw3aw5swv3s6q"), // h3y6e - JA + other stuff
  bech32ToHex("npub17q5n2z8naw0xl6vu9lvt560lg33pdpe29k0k09umlfxm3vc4tqrq466f2y"), // w3irdrobot
  bech32ToHex("npub1ltx67888tz7lqnxlrg06x234vjnq349tcfyp52r0lstclp548mcqnuz40t"), // Vivek
  bech32ToHex("npub1wh30wunfpkezx5s7edqu9g0s0raeetf5dgthzm0zw7sk8wqygmjqqfljgh"), // Fernando Porazzi
];

const Translators = [
  bech32ToHex("npub1s8zws5frm94esxnp9v6zf7vk60m3hum3305n78sr73t78kleus7q8zpwna"), // middlingphys - JA
  bech32ToHex("npub1z0ykz6lp3y8rjjntenns0ee02062g2f0n55u49w44xdemw35vcpsda5jhh"), // noraglyphs - JA
  bech32ToHex("npub13wa880se2h3l54k7x76edrkrt4p94sh4q090974mt0z6n09qtntqxp47uk"), // numpad0 - JA
  bech32ToHex("npub147ccm75um0zkn0lr9fg9wrag2g6yxfw234fpmhdwuvaqjyegrhgs46t2td"), // ROBO358 - JA
  bech32ToHex("npub1ppxgsqdv4ygvdnzznudahtwqc3vaqjz3824vawfgwchpegz0lsjqqys35r"), // Kisato - JA

  bech32ToHex("npub1ww8kjxz2akn82qptdpl7glywnchhkx3x04hez3d3rye397turrhssenvtp"), // Zoltan - HU

  bech32ToHex("npub1x8dzy9xegwmdk2vy30l8u08caspcqq2yzncxehdsa6kvnte9pr3qnt8pg4"), // solobalbo - FR

  bech32ToHex("npub1xwm9svxrlymymph0hka40zw9frg98m6adxmzcq26jhtm5gwlhjrshhgzfd"), // meitsjustme - ZH
  bech32ToHex("npub1raspu6ag9kfcw9jz0rz4z693qwmqe5sx6jdhhuvkwz5zy8rygztqnwfhd7"), // ra5pvt1n - ZH

  bech32ToHex("npub13tkge7eqeem5cz8gk7gdju76nytvvf064hm5mzmv3x26k2uvaxfqczet2j"), // Mendace - IT

  bech32ToHex("npub10529hxckjm5t5mchss5lnpsqrmavulglxhrmu5quuu4hs6yuyh3qc9gxd5"), // aadbitcoin - ID

  bech32ToHex("npub19jk45jz45gczwfm22y9z69xhaex3nwg47dz84zw096xl6z62amkqj99rv7"), // Pextar - SV

  bech32ToHex("npub1z9n5ktfjrlpyywds9t7ljekr9cm9jjnzs27h702te5fy8p2c4dgs5zvycf"), // Felix - DE

  bech32ToHex("npub1wh30wunfpkezx5s7edqu9g0s0raeetf5dgthzm0zw7sk8wqygmjqqfljgh"), // Fernando Porazzi - pt-BR

  bech32ToHex("npub1ust7u0v3qffejwhqee45r49zgcyewrcn99vdwkednd356c9resyqtnn3mj"), // Petri - FI
];

export const DonateLNURL = "donate@snort.social";

const DonatePage = () => {
  const [splits, setSplits] = useState<RevenueSplit[]>([]);
  const [today, setSumToday] = useState<RevenueToday>();
  const [onChain, setOnChain] = useState("");
  const api = new SnortApi(ApiHost);

  async function getOnChainAddress() {
    const { address } = await api.onChainDonation();
    setOnChain(address);
  }

  async function loadData() {
    const rsp = await api.revenueSplits();
    setSplits(rsp);
    const rsp2 = await api.revenueToday();
    setSumToday(rsp2);
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
    <div className="main-content p">
      <h2>
        <FormattedMessage
          defaultMessage="Help fund the development of {site}"
          values={{ site: CONFIG.appNameCapitalized }}
        />
      </h2>
      <p>
        <FormattedMessage
          defaultMessage="{site} is an open source project built by passionate people in their free time"
          values={{ site: CONFIG.appNameCapitalized }}
        />
      </p>
      <p>
        <FormattedMessage defaultMessage="Your donations are greatly appreciated" />
      </p>
      <p>
        <FormattedMessage
          defaultMessage={"Check out the code here: {link}"}
          values={{
            link: (
              <a className="highlight" href="https://git.v0l.io/Kieran/snort" rel="noreferrer" target="_blank">
                https://git.v0l.io/Kieran/snort
              </a>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage defaultMessage="Each contributor will get paid a percentage of all donations and NIP-05 orders, you can see the split amounts below" />
      </p>
      <div className="flex flex-col g12">
        <div className="b br p">
          <div className="flex justify-between">
            <FormattedMessage defaultMessage="Lightning Donation" />
            <ZapButton pubkey={bech32ToHex(SnortPubKey)} lnurl={DonateLNURL}>
              <FormattedMessage defaultMessage="Donate" />
            </ZapButton>
          </div>
          {today && (
            <small>
              <FormattedMessage
                defaultMessage="Total today (UTC): {amount} sats"
                values={{ amount: today.donations.toLocaleString() }}
              />
            </small>
          )}
        </div>
        <div className="b br p">
          <div className="flex justify-between">
            <FormattedMessage defaultMessage="On-chain Donation" />
            <AsyncButton type="button" onClick={getOnChainAddress}>
              <FormattedMessage defaultMessage="Get Address" />
            </AsyncButton>
          </div>
        </div>
      </div>
      {onChain && (
        <Modal onClose={() => setOnChain("")} id="donate-on-chain">
          <div className="flex flex-col items-center g12">
            <h2>
              <FormattedMessage defaultMessage="On-chain Donation Address" />
            </h2>
            <QrCode data={onChain} link={`bitcoin:${onChain}`} />
            <Copy text={onChain} />
          </div>
        </Modal>
      )}
      <h3>
        <FormattedMessage defaultMessage="Primary Developers" />
      </h3>
      {DeveloperAccounts.map(a => (
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
