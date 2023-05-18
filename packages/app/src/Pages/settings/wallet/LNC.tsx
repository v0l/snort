import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";

import AsyncButton from "Element/AsyncButton";
import { LNWallet, WalletInfo, WalletKind, Wallets } from "Wallet";
import { unwrap } from "Util";

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
      const { LNCWallet } = await import("Wallet/LNCWallet");
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
          })
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
    navigate("/wallet");
  }

  function flowConnect() {
    if (connectedLNC) return null;
    return (
      <>
        <h4>
          <FormattedMessage defaultMessage="Enter pairing phrase" />
        </h4>
        <div className="flex">
          <div className="f-grow mr10">
            <input
              type="text"
              placeholder={formatMessage({ defaultMessage: "Pairing phrase" })}
              className="w-max"
              value={pairingPhrase}
              onChange={e => setPairingPhrase(e.target.value)}
            />
          </div>
          <AsyncButton onClick={() => tryConnect(unwrap(pairingPhrase))} disabled={!pairingPhrase}>
            <FormattedMessage defaultMessage="Connect" />
          </AsyncButton>
        </div>
        {error && <b className="error p10">{error}</b>}
      </>
    );
  }

  function flowSetPassword() {
    if (!connectedLNC) return null;
    return (
      <div className="flex f-col">
        <h3>
          <FormattedMessage
            defaultMessage="Connected to: {node} 🎉"
            values={{
              node: walletInfo?.alias,
            }}
          />
        </h3>
        <h4>
          <FormattedMessage defaultMessage="Enter password" />
        </h4>
        <div className="flex w-max">
          <div className="f-grow mr10">
            <input
              type="password"
              placeholder={formatMessage({ defaultMessage: "Wallet password" })}
              className="w-max"
              value={walletPassword}
              onChange={e => setWalletPassword(e.target.value)}
            />
          </div>
          <AsyncButton
            onClick={() => setLNCPassword(unwrap(walletPassword))}
            disabled={(walletPassword?.length ?? 0) < 8}>
            <FormattedMessage defaultMessage="Save" />
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
