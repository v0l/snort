import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { v4 as uuid } from "uuid";

import AsyncButton from "@/Element/Button/AsyncButton";
import { unwrap } from "@/SnortUtils";
import { WalletConfig, WalletKind, Wallets } from "@/Wallet";
import { Link, useNavigate } from "react-router-dom";
import { NostrConnectWallet } from "@/Wallet/NostrWalletConnect";

const ConnectNostrWallet = () => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const [config, setConfig] = useState<string>();
  const [error, setError] = useState<string>();

  async function tryConnect(config: string) {
    try {
      const connection = new NostrConnectWallet(config);
      await connection.login();
      const info = await connection.getInfo();

      const newWallet = {
        id: uuid(),
        kind: WalletKind.NWC,
        active: true,
        info,
        data: config,
      } as WalletConfig;
      Wallets.add(newWallet);

      navigate("/settings/wallet");
    } catch (e) {
      if (e instanceof Error) {
        setError((e as Error).message);
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

  return (
    <>
      <h4>
        <FormattedMessage defaultMessage="Enter Nostr Wallet Connect config" id="1R43+L" />
      </h4>
      <div className="flex">
        <div className="grow mr10">
          <input
            type="text"
            placeholder="nostr+walletconnect:<pubkey>?relay=<relay>&secret=<secret>"
            className="w-max"
            value={config}
            onChange={e => setConfig(e.target.value)}
          />
        </div>
        <AsyncButton onClick={() => tryConnect(unwrap(config))} disabled={!config}>
          <FormattedMessage defaultMessage="Connect" id="+vVZ/G" />
        </AsyncButton>
      </div>
      {error && <b className="error p10">{error}</b>}
      <p>
        <FormattedMessage
          defaultMessage="Using Alby? Go to {link} to get your NWC config!"
          id="cFbU1B"
          values={{
            link: (
              <Link to="https://nwc.getalby.com/" target="_blank">
                nwc.getalby.com
              </Link>
            ),
          }}
        />
      </p>
    </>
  );
};

export default ConnectNostrWallet;
