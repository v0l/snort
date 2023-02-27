import { useEffect } from "react";

interface WebLNPaymentResponse {
  paymentHash: string;
  preimage: string;
  route: {
    total_amt: number;
    total_fees: number;
  };
}
declare global {
  interface Window {
    webln?: {
      enabled: boolean;
      enable: () => Promise<void>;
      sendPayment: (pr: string) => Promise<WebLNPaymentResponse>;
    };
  }
}

export default function useWebln(enable = true) {
  const maybeWebLn = "webln" in window ? window.webln : null;

  useEffect(() => {
    if (maybeWebLn && !maybeWebLn.enabled && enable) {
      maybeWebLn.enable().catch(() => {
        console.debug("Couldn't enable WebLN");
      });
    }
  }, [maybeWebLn, enable]);

  return maybeWebLn;
}
