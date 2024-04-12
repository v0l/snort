import "./CashuNuts.css";

import { useUserProfile } from "@snort/system-react";
import { useEffect, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import ECashIcon from "@/Components/Icons/ECash";
import Icon from "@/Components/Icons/Icon";
import { useCopy } from "@/Hooks/useCopy";
import useLogin from "@/Hooks/useLogin";

interface Token {
  token: Array<{
    mint: string;
    proofs: Array<{
      amount: number;
    }>;
  }>;
  memo?: string;
}

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
      import("@cashu/cashu-ts").then(({ getDecodedToken }) => {
        const tkn = getDecodedToken(token);
        setCashu(tkn);
      });
    } catch {
      // ignored
    }
  }, [token]);

  if (!cashu) return <>{token}</>;

  const amount = cashu.token[0].proofs.reduce((acc, v) => acc + v.amount, 0);
  return (
    <div className="cashu flex justify-between p24 br items-center">
      <div className="flex flex-col gap-2 f-ellipsis">
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
          <FormattedMessage defaultMessage="Redeem" id="XrSk2j" description="Button: Redeem Cashu token" />
        </AsyncButton>
      </div>
    </div>
  );
}
