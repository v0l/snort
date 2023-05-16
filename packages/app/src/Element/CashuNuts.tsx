import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

import useLogin from "Hooks/useLogin";
import { useUserProfile } from "Hooks/useUserProfile";

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
  const login = useLogin();
  const profile = useUserProfile(login.publicKey);

  async function copyToken(e: React.MouseEvent<HTMLButtonElement>, token: string) {
    e.stopPropagation();
    await navigator.clipboard.writeText(token);
  }
  async function redeemToken(e: React.MouseEvent<HTMLButtonElement>, token: string) {
    e.stopPropagation();
    const lnurl = profile?.lud16 ?? "";
    const url = `https://redeem.cashu.me?token=${encodeURIComponent(token)}&lightning=${encodeURIComponent(
      lnurl
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

  return (
    <div className="note-invoice">
      <div className="flex f-between">
        <div>
          <h4>
            <FormattedMessage defaultMessage="Cashu token" />
          </h4>
          <p>
            <FormattedMessage
              defaultMessage="Amount: {amount} sats"
              values={{
                amount: cashu.token[0].proofs.reduce((acc, v) => acc + v.amount, 0),
              }}
            />
          </p>
          <small className="xs">
            <FormattedMessage defaultMessage="Mint: {url}" values={{ url: cashu.token[0].mint }} />
          </small>
        </div>
        <div>
          <button onClick={e => copyToken(e, token)} className="mr5">
            <FormattedMessage defaultMessage="Copy" description="Button: Copy Cashu token" />
          </button>
          <button onClick={e => redeemToken(e, token)}>
            <FormattedMessage defaultMessage="Redeem" description="Button: Redeem Cashu token" />
          </button>
        </div>
      </div>
    </div>
  );
}
