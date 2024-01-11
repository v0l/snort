import React from "react";
import { FormattedMessage } from "react-intl";

import { SendSatsInputSelection } from "@/Components/SendSats/SendSatsInput";
import ProfileImage from "@/Components/User/ProfileImage";
import { formatShort } from "@/Utils/Number";
import { Zapper, ZapTarget } from "@/Utils/Zapper";

export function SendSatsTitle({
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
            <FormattedMessage defaultMessage="Send zap" id="5ykRmX" />
          ) : (
            <FormattedMessage defaultMessage="Send sats" id="DKnriN" />
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
            <FormattedMessage defaultMessage="Send zap to {name}" id="SMO+on" values={values} />
          ) : (
            <FormattedMessage defaultMessage="Send sats to {name}" id="JGrt9q" values={values} />
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
            <FormattedMessage defaultMessage="Send zap splits to" id="ZS+jRE" />
          ) : (
            <FormattedMessage defaultMessage="Send sats splits to" id="uc0din" />
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
