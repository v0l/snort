import "./CashuNuts.css";
import { useEffect, useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { useUserProfile } from "@snort/system-react";

import useLogin from "Hooks/useLogin";
import Icon from "Icons/Icon";

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
    <div className="cashu flex f-space p24 br">
      <div className="flex-column g8 f-ellipsis">
        <div className="flex f-center g16">
          <svg width="30" height="39" viewBox="0 0 30 39" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="Group 47711">
              <path id="Rectangle 585" d="M29.3809 2.47055L29.3809 11.7277L26.7913 11.021C23.8493 10.2181 20.727 10.3835 17.8863 11.4929C15.5024 12.4238 12.9113 12.6933 10.3869 12.2728L7.11501 11.7277L7.11501 2.47054L10.3869 3.01557C12.9113 3.43607 15.5024 3.1666 17.8863 2.23566C20.727 1.12632 23.8493 0.960876 26.7913 1.7638L29.3809 2.47055Z" fill="url(#paint0_linear_1976_19241)" />
              <path id="Rectangle 587" d="M29.3809 27.9803L29.3809 37.2375L26.7913 36.5308C23.8493 35.7278 20.727 35.8933 17.8863 37.0026C15.5024 37.9336 12.9113 38.203 10.3869 37.7825L7.11501 37.2375L7.11501 27.9803L10.3869 28.5253C12.9113 28.9458 15.5024 28.6764 17.8863 27.7454C20.727 26.6361 23.8493 26.4706 26.7913 27.2736L29.3809 27.9803Z" fill="url(#paint1_linear_1976_19241)" />
              <path id="Rectangle 586" d="M8.494e-08 15.2069L4.89585e-07 24.4641L2.5896 23.7573C5.53159 22.9544 8.6539 23.1198 11.4946 24.2292C13.8784 25.1601 16.4695 25.4296 18.9939 25.0091L22.2658 24.4641L22.2658 15.2069L18.9939 15.7519C16.4695 16.1724 13.8784 15.9029 11.4946 14.972C8.6539 13.8627 5.53159 13.6972 2.5896 14.5001L8.494e-08 15.2069Z" fill="url(#paint2_linear_1976_19241)" />
            </g>
            <defs>
              <linearGradient id="paint0_linear_1976_19241" x1="29.3809" y1="6.7213" x2="7.11501" y2="6.7213" gradientUnits="userSpaceOnUse">
                <stop stop-color="white" />
                <stop offset="1" stop-color="white" stop-opacity="0.5" />
              </linearGradient>
              <linearGradient id="paint1_linear_1976_19241" x1="29.3809" y1="32.2311" x2="7.11501" y2="32.2311" gradientUnits="userSpaceOnUse">
                <stop stop-color="white" />
                <stop offset="1" stop-color="white" stop-opacity="0.5" />
              </linearGradient>
              <linearGradient id="paint2_linear_1976_19241" x1="2.70746e-07" y1="19.4576" x2="22.2658" y2="19.4576" gradientUnits="userSpaceOnUse">
                <stop stop-color="white" />
                <stop offset="1" stop-color="white" stop-opacity="0.5" />
              </linearGradient>
            </defs>
          </svg>
          <FormattedMessage
            defaultMessage="<h1>{n}</h1> Cashu sats"
            values={{
              h1: (c) => <h1>{c}</h1>,
              n: <FormattedNumber value={amount} />
            }} />
        </div>
        <small className="xs w-max">
          <FormattedMessage defaultMessage="<b>Mint:</b> {url}" values={{
            b: (c) => <b>{c}</b>,
            url: new URL(cashu.token[0].mint).hostname
          }} />
        </small>
      </div>
      <div className="flex g8">
        <button onClick={e => copyToken(e, token)}>
          <Icon name="copy" />
        </button>
        <button onClick={e => redeemToken(e, token)}>
          <FormattedMessage defaultMessage="Redeem" description="Button: Redeem Cashu token" />
        </button>
      </div>
    </div>
  );
}
