import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { useNavigate } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import { useRates } from "@/Hooks/useRates";
import { useWallet } from "@/Wallet";
import { getCurrency, getLocale } from "@/Components/IntlProvider/IntlProviderUtils";

export const WalletBalance = () => {
  const [balance, setBalance] = useState<number>();
  const wallet = useWallet();
  const localCurrency = getCurrency();
  const rates = useRates(`BTC${localCurrency}`);
  const navigate = useNavigate();

  useEffect(() => {
    setBalance(undefined);
    if (wallet.wallet && wallet.wallet.canGetBalance()) {
      wallet.wallet.getBalance().then(setBalance);
    }
  }, [wallet]);

  return (
    <div className="w-full flex flex-col max-xl:hidden pl-3 py-2 cursor-pointer" onClick={() => navigate("/wallet")}>
      <div className="grow flex items-center justify-between">
        <div className="flex gap-1 items-center text-xl">
          <Icon name="sats" size={28} />
          <FormattedNumber value={balance ?? 0} />
        </div>
        <Icon name="dots" className="text-secondary" />
      </div>
      <div className="text-secondary text-xs flex justify-between items-center">
        <div>
          ~
          <FormattedNumber
            style="currency"
            currency={localCurrency}
            value={(rates?.ask ?? 0) * (balance ?? 0) * 1e-8}
            currencyDisplay="narrowSymbol"
          />
        </div>
        <div>
          <FormattedNumber
            style="currency"
            currency={localCurrency}
            value={rates?.ask ?? 0}
            maximumFractionDigits={0}
            currencyDisplay="narrowSymbol"
          />
        </div>
      </div>
    </div>
  );
};
