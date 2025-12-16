import type { Zapper, ZapTarget } from "@snort/wallet";
import { FormattedMessage } from "react-intl";

import ProfileImage from "@/Components/User/ProfileImage";
import type { SendSatsInputSelection } from "@/Components/ZapModal/ZapModalInput";
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
        <div className="text-lg font-medium">
          {zapper?.canZap() ? (
            <FormattedMessage defaultMessage="Send zap" />
          ) : (
            <FormattedMessage defaultMessage="Send sats" />
          )}
        </div>
      </>
    );
  }
  if (targets.length === 1 && targets[0].name) {
    const t = targets[0];
    const values = {
      name: t.name,
    };
    return (
      <ProfileImage
        pubkey={t.zap?.pubkey ?? ""}
        overrideUsername={
          <div className="text-lg font-medium">
            {zapper?.canZap() ? (
              <FormattedMessage defaultMessage="Zap {name}" values={values} />
            ) : (
              <FormattedMessage defaultMessage="Send sats to {name}" values={values} />
            )}
          </div>
        }
        link=""
      />
    );
  }
  if (targets.length > 1) {
    const total = targets.reduce((acc, v) => (acc += v.weight), 0);

    return (
      <div className="flex flex-col gap-3">
        <div className="text-lg font-medium">
          {zapper?.canZap() ? (
            <FormattedMessage defaultMessage="Send zap splits to" />
          ) : (
            <FormattedMessage defaultMessage="Send sats splits to" />
          )}
        </div>
        <div className="flex gap-1 f-wrap">
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
