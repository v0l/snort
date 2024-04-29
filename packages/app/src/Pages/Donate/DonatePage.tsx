import { HexKey } from "@snort/system";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useNavigate } from "react-router-dom";

import Telegram from "@/assets/img/telegram.svg";
import { Nip28ChatSystem } from "@/chat/nip28";
import AsyncButton from "@/Components/Button/AsyncButton";
import Copy from "@/Components/Copy/Copy";
import ZapButton from "@/Components/Event/ZapButton";
import Modal from "@/Components/Modal/Modal";
import QrCode from "@/Components/QrCode";
import ProfilePreview from "@/Components/User/ProfilePreview";
import SnortApi, { RevenueSplit, RevenueToday } from "@/External/SnortApi";
import { Contributors, DonateLNURL, Translators } from "@/Pages/Donate/const";
import { ZapPoolDonateSection } from "@/Pages/Donate/ZapPoolDonateSection";
import { bech32ToHex } from "@/Utils";
import { ApiHost, DeveloperAccounts, SnortPubKey } from "@/Utils/Const";

const DonatePage = () => {
  const [splits, setSplits] = useState<RevenueSplit[]>([]);
  const [today, setSumToday] = useState<RevenueToday>();
  const [onChain, setOnChain] = useState("");
  const api = new SnortApi(ApiHost);
  const navigate = useNavigate();

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
      <p>
        <FormattedMessage
          defaultMessage="Snort is an open source project built by passionate people in their free time, your donations are greatly appreciated"
          id="fLIvbC"
        />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="Check out the code {link}"
          id="LKw/ue"
          values={{
            link: (
              <a
                className="highlight underline"
                href="https://git.v0l.io/Kieran/snort"
                rel="noreferrer"
                target="_blank">
                here
              </a>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="To see a full list of changes you can view the changelog {here}"
          id="VfhYxG"
          values={{
            here: (
              <Link to="/about" className="highlight underline">
                <FormattedMessage defaultMessage="here" />
              </Link>
            ),
          }}
        />
      </p>
      {CONFIG.chatChannels && (
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
                case "nip28": {
                  return (
                    <AsyncButton
                      onClick={() => {
                        const id = Nip28ChatSystem.chatId(a.value);
                        navigate(`/messages/${id}`);
                      }}>
                      <img src={CONFIG.icon} width={24} height={24} className="rounded-full" />
                      <FormattedMessage defaultMessage="Nostr Public Chat" />
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
      <div className="flex flex-col g12">
        <div className="b br p">
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
                id="P7nJT9"
                values={{ amount: today.donations.toLocaleString() }}
              />
            </small>
          )}
        </div>
        <div className="b br p">
          <div className="flex items-center justify-between">
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
      <ZapPoolDonateSection />
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
