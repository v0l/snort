import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { v4 as uuid } from "uuid";

import AsyncButton from "Element/AsyncButton";
import { unwrap } from "SnortUtils";
import { WalletConfig, WalletKind, Wallets } from "Wallet";
import { useNavigate } from "react-router-dom";

const ConnectCashu = () => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const [mintUrl, setMintUrl] = useState<string>();
  const [error, setError] = useState<string>();

  async function tryConnect(config: string) {
    try {
      if (!mintUrl) {
        throw new Error("Mint URL is required");
      }

      const { CashuWallet } = await import("Wallet/Cashu");
      const connection = new CashuWallet(config);
      await connection.login();
      const info = await connection.getInfo();
      const newWallet = {
        id: uuid(),
        kind: WalletKind.Cashu,
        active: true,
        info,
        data: mintUrl,
      } as WalletConfig;
      Wallets.add(newWallet);
      navigate("/wallet");
    } catch (e) {
      if (e instanceof Error) {
        setError((e as Error).message);
      } else {
        setError(
          formatMessage({
            defaultMessage: "Unknown error",
          })
        );
      }
    }
  }

  return (
    <>
      <h4>
        <FormattedMessage defaultMessage="Enter mint URL" />
      </h4>
      <div className="flex">
        <div className="f-grow mr10">
          <input
            type="text"
            placeholder="Mint URL"
            className="w-max"
            value={mintUrl}
            onChange={e => setMintUrl(e.target.value)}
          />
        </div>
        <AsyncButton onClick={() => tryConnect(unwrap(mintUrl))} disabled={!mintUrl}>
          <FormattedMessage defaultMessage="Connect" />
        </AsyncButton>
      </div>
      {error && <b className="error p10">{error}</b>}
    </>
  );
};

export default ConnectCashu;
