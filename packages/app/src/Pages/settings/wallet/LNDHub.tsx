import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { v4 as uuid } from "uuid";

import AsyncButton from "@/Element/AsyncButton";
import { unwrap } from "@/SnortUtils";
import LNDHubWallet from "@/Wallet/LNDHub";
import { WalletConfig, WalletKind, Wallets } from "@/Wallet";
import { useNavigate } from "react-router-dom";

const ConnectLNDHub = () => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const [config, setConfig] = useState<string>();
  const [error, setError] = useState<string>();

  async function tryConnect(config: string) {
    try {
      const connection = new LNDHubWallet(config);
      await connection.login();
      const info = await connection.getInfo();

      const newWallet = {
        id: uuid(),
        kind: WalletKind.LNDHub,
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
          }),
        );
      }
    }
  }

  return (
    <>
      <h4>
        <FormattedMessage defaultMessage="Enter LNDHub config" />
      </h4>
      <div className="flex">
        <div className="grow mr10">
          <input
            type="text"
            placeholder="lndhub://username:password@lndhub.io"
            className="w-max"
            value={config}
            onChange={e => setConfig(e.target.value)}
          />
        </div>
        <AsyncButton onClick={() => tryConnect(unwrap(config))} disabled={!config}>
          <FormattedMessage defaultMessage="Connect" />
        </AsyncButton>
      </div>
      {error && <b className="error p10">{error}</b>}
    </>
  );
};

export default ConnectLNDHub;
