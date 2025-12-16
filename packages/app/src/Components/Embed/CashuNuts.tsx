import { useUserProfile } from "@snort/system-react";
import { useEffect, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import ECashIcon from "@/Components/Icons/ECash";
import Icon from "@/Components/Icons/Icon";
import { useCopy } from "@/Hooks/useCopy";
import useLogin from "@/Hooks/useLogin";
import { WarningNotice } from "../WarningNotice/WarningNotice";
import { getDecodedToken, type Token } from "@cashu/cashu-ts";

export default function CashuNuts({ token }: { token: string }) {
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  const profile = useUserProfile(publicKey);
  const { copy } = useCopy();

  async function redeemToken(token: string) {
    const lnurl = profile?.lud16 ?? "";
    const url = `https://redeem.cashu.me?token=${encodeURIComponent(token)}&lightning=${encodeURIComponent(
      lnurl,
    )}&autopay=yes`;
    window.open(url, "_blank");
  }

  const [cashu, setCashu] = useState<Token>();
  useEffect(() => {
    try {
      if (!token.startsWith("cashuA") || token.length < 10) {
        return;
      }
      const tkn = getDecodedToken(token);
      setCashu(tkn);
    } catch (e) {
      // ignored
      console.warn(e);
    }
  }, [token]);

  if (!cashu)
    return (
      <WarningNotice>
        <FormattedMessage defaultMessage="Invalid cashu token" />
      </WarningNotice>
    );

  const amount = cashu.proofs.reduce((acc, v) => acc + v.amount, 0);
  return (
    <div
      className="flex justify-between p-6 rounded-lg items-center"
      style={{
        backgroundImage: "linear-gradient(90deg, #40b039, #adff2a)",
      }}>
      <div className="flex flex-col gap-2 min-w-0 truncate overflow-hidden text-ellipsis">
        <div className="flex items-center gap-4">
          <ECashIcon width={30} />
          <FormattedMessage
            defaultMessage="{n} eSats"
            id="yAztTU"
            values={{
              n: (
                <span className="text-3xl">
                  <FormattedNumber value={amount} />
                </span>
              ),
            }}
          />
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <AsyncButton onClick={() => copy(token)}>
          <Icon name="copy" />
        </AsyncButton>
        <AsyncButton onClick={() => redeemToken(token)}>
          <FormattedMessage defaultMessage="Redeem" />
        </AsyncButton>
      </div>
    </div>
  );
}
