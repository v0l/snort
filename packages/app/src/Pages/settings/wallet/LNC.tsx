import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";

import AsyncButton from "@/Element/AsyncButton";
import { LNWallet, WalletInfo, WalletKind, Wallets } from "@/Wallet";
import { unwrap } from "@/SnortUtils";

const ConnectLNC = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const [pairingPhrase, setPairingPhrase] = useState<string>();
  const [error, setError] = useState<string>();
  const [connectedLNC, setConnectedLNC] = useState<LNWallet & { setPassword(pw: string): void }>();
  const [walletInfo, setWalletInfo] = useState<WalletInfo>();
  const [walletPassword, setWalletPassword] = useState<string>();

  async function tryConnect(cfg: string) {
    try {
      const { LNCWallet } = await import("@/Wallet/LNCWallet");
      const lnc = await LNCWallet.Initialize(cfg);
      const info = await lnc.getInfo();

      // prompt password
      setConnectedLNC(lnc);
      setWalletInfo(info as WalletInfo);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(
          formatMessage({
            defaultMessage: "Unknown error",
            id: "qDwvZ4",
          }),
        );
      }
    }
  }

  function setLNCPassword(pw: string) {
    connectedLNC?.setPassword(pw);
    Wallets.add({
      id: uuid(),
      kind: WalletKind.LNC,
      active: true,
      info: unwrap(walletInfo),
    });
    navigate("/settings/wallet");
  }

  function flowConnect() {
    if (connectedLNC) return null;
    return (
      <>
        <h4>
          <FormattedMessage defaultMessage="Enter pairing phrase" id="Z4BMCZ" />
        </h4>
        <div className="flex">
          <div className="grow mr10">
            <input
              type="text"
              placeholder={formatMessage({ defaultMessage: "Pairing phrase", id: "8v1NN+" })}
              className="w-max"
              value={pairingPhrase}
              onChange={e => setPairingPhrase(e.target.value)}
            />
          </div>
          <AsyncButton onClick={() => tryConnect(unwrap(pairingPhrase))} disabled={!pairingPhrase}>
            <FormattedMessage defaultMessage="Connect" id="+vVZ/G" />
          </AsyncButton>
        </div>
        {error && <b className="error p10">{error}</b>}
      </>
    );
  }

  function flowSetPassword() {
    if (!connectedLNC) return null;
    return (
      <div className="flex flex-col">
        <h3>
          <FormattedMessage
            defaultMessage="Connected to: {node} 🎉"
            id="1c4YST"
            values={{
              node: walletInfo?.alias,
            }}
          />
        </h3>
        <h4>
          <FormattedMessage defaultMessage="Enter password" id="2LbrkB" />
        </h4>
        <div className="flex w-max">
          <div className="grow mr10">
            <input
              type="password"
              placeholder={formatMessage({ defaultMessage: "Wallet password", id: "lTbT3s" })}
              className="w-max"
              value={walletPassword}
              onChange={e => setWalletPassword(e.target.value)}
            />
          </div>
          <AsyncButton
            onClick={() => setLNCPassword(unwrap(walletPassword))}
            disabled={(walletPassword?.length ?? 0) < 8}>
            <FormattedMessage defaultMessage="Save" id="jvo0vs" />
          </AsyncButton>
        </div>
      </div>
    );
  }

  return (
    <>
      {flowConnect()}
      {flowSetPassword()}
    </>
  );
};

export default ConnectLNC;
