import LndLogo from "@/lnd-logo.png";
import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import BlueWallet from "@/Icons/BlueWallet";
import NostrIcon from "@/Icons/Nostrich";
import CashuIcon from "@/Icons/Cashu";
import AlbyIcon from "@/Icons/Alby";
import Icon from "@/Icons/Icon";
import { getAlbyOAuth } from "./wallet/Alby";

const WalletRow = (props: { logo: ReactNode, name: ReactNode, url: string, desc?: ReactNode }) => {
  const navigate = useNavigate();
  return <div className="flex items-center gap-4 px-4 py-2 bg-[--gray-superdark] rounded-xl hover:bg-[--gray-ultradark]" onClick={() => {
    if (props.url.startsWith("http")) {
      window.location.href = props.url;
    } else {
      navigate(props.url);
    }
  }}>
    <div className="rounded-xl aspect-square h-[4rem] bg-[--gray-dark] p-3 flex items-center justify-center">
      {props.logo}
    </div>
    <div className="flex flex-col gap-1 grow justify-center">
      <div className="text-xl font-bold">{props.name}</div>
      <div className="text-sm text-secondary">{props.desc}</div>
    </div>
    <Icon name="arrowFront" />
  </div>
}

const WalletSettings = () => {
  const alby = getAlbyOAuth();
  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Connect Wallet" id="cg1VJ2" />
      </h3>
      <div className="flex flex-col gap-3 cursor-pointer">
        <WalletRow
          logo={<NostrIcon width={64} height={64} />}
          name="Nostr Wallet Connect"
          url="/settings/wallet/nwc"
          desc={<FormattedMessage defaultMessage="Native nostr wallet connection" id="cG/bKQ" />} />
        <WalletRow
          logo={<img src={LndLogo} />}
          name="LND via LNC"
          url="/settings/wallet/lnc"
          desc={<FormattedMessage defaultMessage="Connect to your own LND node with Lightning Node Connect" id="aSGz4J" />} />
        <WalletRow
          logo={<BlueWallet width={64} height={64} />}
          name="LNDHub"
          url="/settings/wallet/lndhub"
          desc={<FormattedMessage defaultMessage="Generic LNDHub wallet (BTCPayServer / Alby / LNBits)" id="0MndVW" />} />
        <WalletRow
          logo={<CashuIcon size={64} />}
          name="Cashu"
          url="/settings/wallet/cashu"
          desc={<FormattedMessage defaultMessage="Cashu mint wallet" id="3natuV" />} />
        <WalletRow
          logo={<AlbyIcon size={64} />}
          name="Alby"
          url={alby.authUrl}
          desc={<FormattedMessage defaultMessage="Alby wallet connection" id="XPB8VV" />} />
      </div>
    </>
  );
};

export default WalletSettings;