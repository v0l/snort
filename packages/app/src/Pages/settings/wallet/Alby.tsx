import { AlbyWallet, WalletKind } from "@snort/wallet";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";

import PageSpinner from "@/Components/PageSpinner";
import { getAlbyOAuth } from "@/Pages/settings/wallet/utils";
import { type WalletConfig, Wallets } from "@/Wallet";

export default function AlbyOAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const alby = getAlbyOAuth();
  const [error, setError] = useState("");

  async function setupWallet(token: string) {
    try {
      const auth = await alby.getToken(token);
      const connection = new AlbyWallet(auth);
      const info = await connection.getInfo();

      const newWallet = {
        id: uuid(),
        kind: WalletKind.Alby,
        active: true,
        info,
        data: JSON.stringify(auth),
      } as WalletConfig;
      Wallets.add(newWallet);

      navigate("/settings/wallet");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (location.search) {
      const params = new URLSearchParams(location.search);
      const token = params.get("code");
      if (token) {
        setupWallet(token).catch(e => {
          setError((e as Error).message);
        });
      }
    }
  }, [location]);

  if (!location.search) return;
  return (
    <>
      <h1>Alby Wallet Connection</h1>
      {!error && <PageSpinner />}
      {error && <b className="warning">{error}</b>}
    </>
  );
}
