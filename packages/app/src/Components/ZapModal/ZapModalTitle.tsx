import { Zapper, ZapTarget } from "@snort/wallet";
import { FormattedMessage } from "react-intl";

import ProfileImage from "@/Components/User/ProfileImage";
import { SendSatsInputSelection } from "@/Components/ZapModal/ZapModalInput";
import { formatShort } from "@/Utils/Number";

export function ZapModalTitle({
  targets,
  zapper,
  amount,
}: {
  targets?: Array<ZapTarget>;
  zapper?: Zapper;
  amount?: SendSatsInputSelection;
}) {
  if (!targets) {
    return (
      <>
        <h2>
          {zapper?.canZap() ? (
            <FormattedMessage defaultMessage="Send zap" />
          ) : (
            <FormattedMessage defaultMessage="Send sats" />
          )}
        </h2>
      </>
    );
  }
  if (targets.length === 1 && targets[0].name) {
    const t = targets[0];
    const values = {
      name: t.name,
    };
    return (
      <>
        {t.zap?.pubkey && <ProfileImage pubkey={t.zap.pubkey} showUsername={false} />}
        <h2>
          {zapper?.canZap() ? (
            <FormattedMessage defaultMessage="Send zap to {name}" values={values} />
          ) : (
            <FormattedMessage defaultMessage="Send sats to {name}" values={values} />
          )}
        </h2>
      </>
    );
  }
  if (targets.length > 1) {
    const total = targets.reduce((acc, v) => (acc += v.weight), 0);

    return (
      <div className="flex flex-col g12">
        <h2>
          {zapper?.canZap() ? (
            <FormattedMessage defaultMessage="Send zap splits to" />
          ) : (
            <FormattedMessage defaultMessage="Send sats splits to" />
          )}
        </h2>
        <div className="flex g4 f-wrap">
          {targets.map(v => (
            <ProfileImage
              key={v.value}
              pubkey={v.value}
              showUsername={false}
              showFollowDistance={false}
              imageOverlay={formatShort(Math.floor((amount?.amount ?? 0) * (v.weight / total)))}
            />
          ))}
        </div>
      </div>
    );
  }
}
