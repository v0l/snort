import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import Telegram from "@/assets/img/telegram.svg";
import AsyncButton from "@/Components/Button/AsyncButton";
import Copy from "@/Components/Copy/Copy";
import ZapButton from "@/Components/Event/ZapButton";
import Modal from "@/Components/Modal/Modal";
import QrCode from "@/Components/QrCode";
import ProfilePreview from "@/Components/User/ProfilePreview";
import SnortApi, { type RevenueSplit, type RevenueToday } from "@/External/SnortApi";
import { Contributors, DonateLNURL, Translators } from "@/Pages/Donate/const";
import { ZapPoolDonateSection } from "@/Pages/Donate/ZapPoolDonateSection";
import { SnortPubKey } from "@/Utils/Const";
import { bech32ToHex } from "@snort/shared";

const DonatePage = () => {
  const [splits, setSplits] = useState<RevenueSplit[]>([]);
  const [today, setSumToday] = useState<RevenueToday>();
  const [onChain, setOnChain] = useState("");
  const api = new SnortApi();

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

  function actions(pk: string) {
    const split = splits.find(a => bech32ToHex(a.pubKey) === pk);
    if (split) {
      return <>{(100 * split.split).toLocaleString()}%</>;
    }
    return <></>;
  }

  return (
    <div className="px-3 py-2 flex flex-col gap-2">
      <div>
        <FormattedMessage
          defaultMessage="{app} is an open source project built by passionate people in their free time, your donations are greatly appreciated"
          values={{
            app: CONFIG.appNameCapitalized,
          }}
        />
      </div>
      <div>
        <FormattedMessage
          defaultMessage="Check out the code {link}"
          id="LKw/ue"
          values={{
            link: (
              <a className="highlight underline" href="https://github.com/v0l/snort" rel="noreferrer" target="_blank">
                here
              </a>
            ),
          }}
        />
      </div>
      <div>
        <FormattedMessage
          defaultMessage="To see a full list of changes you can view the changelog {here}"
          values={{
            here: (
              <Link to="/about" className="highlight underline">
                <FormattedMessage defaultMessage="here" />
              </Link>
            ),
          }}
        />
      </div>
      {CONFIG.chatChannels && CONFIG.chatChannels.length > 0 && (
        <>
          <h4>
            <FormattedMessage defaultMessage="Public Chat Channels" />
          </h4>
          <div className="flex gap-2">
            {CONFIG.chatChannels.map(a => {
              switch (a.type) {
                case "telegram": {
                  return (
                    <AsyncButton
                      onClick={() => {
                        window.open(a.value, "_blank", "noreferrer");
                      }}>
                      <img src={Telegram} width={24} height={24} />
                      <FormattedMessage defaultMessage="Telegram" />
                    </AsyncButton>
                  );
                }
              }
            })}
          </div>
        </>
      )}
      <h3>
        <FormattedMessage defaultMessage="Donate" />
      </h3>
      <div className="layer-1">
        <div className="flex items-center justify-between">
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
      <div className="layer-1">
        <div className="flex items-center justify-between">
          <FormattedMessage defaultMessage="On-chain Donation" />
          <AsyncButton type="button" onClick={getOnChainAddress}>
            <FormattedMessage defaultMessage="Get Address" />
          </AsyncButton>
        </div>
      </div>
      {onChain && (
        <Modal onClose={() => setOnChain("")} id="donate-on-chain">
          <div className="flex flex-col items-center gap-3">
            <h2>
              <FormattedMessage defaultMessage="On-chain Donation Address" />
            </h2>
            <QrCode data={onChain} link={`bitcoin:${onChain}`} />
            <Copy text={onChain} />
          </div>
        </Modal>
      )}
      <ZapPoolDonateSection />
      <h2>
        <FormattedMessage defaultMessage="Contributors" />
      </h2>
      {Contributors.map(a => (
        <ProfilePreview pubkey={a} key={a} actions={actions(a)} />
      ))}
      <h2>
        <FormattedMessage defaultMessage="Translators" />
      </h2>
      {Translators.map(a => (
        <ProfilePreview pubkey={a} key={a} actions={actions(a)} />
      ))}
    </div>
  );
};

export default DonatePage;
