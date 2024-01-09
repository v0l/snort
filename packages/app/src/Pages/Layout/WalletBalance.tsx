import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { useNavigate } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import { useRates } from "@/Hooks/useRates";
import { Sats, useWallet } from "@/Wallet";

export const WalletBalance = () => {
  const [balance, setBalance] = useState<Sats | null>(null);
  const wallet = useWallet();
  const rates = useRates("BTCUSD");
  const navigate = useNavigate();

  useEffect(() => {
    setBalance(null);
    if (wallet.wallet && wallet.wallet.canGetBalance()) {
      wallet.wallet.getBalance().then(setBalance);
    }
  }, [wallet]);

  const msgValues = useMemo(() => {
    return {
      amount: <FormattedNumber style="currency" currency="USD" value={(rates?.ask ?? 0) * (balance ?? 0) * 1e-8} />,
    };
  }, [balance, rates]);

  return (
    <div className="w-full flex flex-col max-xl:hidden pl-3 py-2 cursor-pointer" onClick={() => navigate("/wallet")}>
      <div className="grow flex items-center justify-between">
        <div className="flex gap-1 items-center text-xl">
          <Icon name="sats" size={28} />
          <FormattedNumber value={balance ?? 0} />
        </div>
        <Icon name="dots" className="text-secondary" />
      </div>
      <div className="text-secondary text-sm">
        <FormattedMessage defaultMessage="~{amount}" id="3QwfJR" values={msgValues} />
      </div>
    </div>
  );
};
