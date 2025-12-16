import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import AlbyIcon from "@/Components/Icons/Alby";
import BlueWallet from "@/Components/Icons/BlueWallet";
import Icon from "@/Components/Icons/Icon";
import NWCIcon from "@/Components/Icons/NWC";
import { getAlbyOAuth } from "@/Pages/settings/wallet/utils";

const WalletRow = (props: {
  logo: ReactNode;
  name: ReactNode;
  url: string;
  desc?: ReactNode;
  onClick?: () => void;
}) => {
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center gap-4 px-4 py-2 layer-1-hover"
      onClick={() => {
        if (props.onClick) {
          props.onClick();
        } else {
          if (props.url.startsWith("http")) {
            window.location.href = props.url;
          } else {
            navigate(props.url);
          }
        }
      }}>
      <div className="aspect-square layer-2 p-3 flex items-center justify-center">{props.logo}</div>
      <div className="flex flex-col gap-1 grow justify-center">
        <div className="text-xl font-bold">{props.name}</div>
        <small>{props.desc}</small>
      </div>
      <Icon name="arrowFront" />
    </div>
  );
};

const WalletSettings = () => {
  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Connect Wallet" />
      </h3>
      <div className="flex flex-col gap-3 cursor-pointer">
        <WalletRow
          logo={<NWCIcon width={64} height={64} />}
          name="Nostr Wallet Connect"
          url="/settings/wallet/nwc"
          desc={<FormattedMessage defaultMessage="Native nostr wallet connection" />}
        />
        <WalletRow
          logo={<BlueWallet width={64} height={64} />}
          name="LNDHub"
          url="/settings/wallet/lndhub"
          desc={<FormattedMessage defaultMessage="Generic LNDHub wallet (BTCPayServer / Alby / LNBits)" />}
        />
        {CONFIG.alby && (
          <WalletRow
            logo={<AlbyIcon size={64} />}
            name="Alby"
            url={""}
            onClick={() => {
              const alby = getAlbyOAuth();
              window.location.href = alby.getAuthUrl();
            }}
            desc={<FormattedMessage defaultMessage="Alby wallet connection" />}
          />
        )}
      </div>
    </>
  );
};

export default WalletSettings;
