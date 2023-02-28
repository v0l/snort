import { useEffect } from "react";
import { delay, unwrap } from "Util";

let isWebLnBusy = false;
export const barrierWebLn = async <T>(then: () => Promise<T>): Promise<T> => {
  while (isWebLnBusy) {
    await delay(10);
  }
  isWebLnBusy = true;
  try {
    return await then();
  } finally {
    isWebLnBusy = false;
  }
};

interface SendPaymentResponse {
  paymentHash?: string;
  preimage: string;
  route?: {
    total_amt: number;
    total_fees: number;
  };
}

interface RequestInvoiceArgs {
  amount?: string | number;
  defaultAmount?: string | number;
  minimumAmount?: string | number;
  maximumAmount?: string | number;
  defaultMemo?: string;
}

interface RequestInvoiceResponse {
  paymentRequest: string;
}

interface GetInfoResponse {
  node: {
    alias: string;
    pubkey: string;
    color?: string;
  };
}

interface SignMessageResponse {
  message: string;
  signature: string;
}

interface WebLN {
  enabled: boolean;
  getInfo(): Promise<GetInfoResponse>;
  enable: () => Promise<void>;
  makeInvoice(args: RequestInvoiceArgs): Promise<RequestInvoiceResponse>;
  signMessage(message: string): Promise<SignMessageResponse>;
  verifyMessage(signature: string, message: string): Promise<void>;
  sendPayment: (pr: string) => Promise<SendPaymentResponse>;
}

declare global {
  interface Window {
    webln?: WebLN;
  }
}

export default function useWebln(enable = true) {
  const maybeWebLn =
    "webln" in window && window.webln
      ? ({
          enabled: unwrap(window.webln).enabled,
          getInfo: () => barrierWebLn(() => unwrap(window.webln).getInfo()),
          enable: () => barrierWebLn(() => unwrap(window.webln).enable()),
          makeInvoice: args => barrierWebLn(() => unwrap(window.webln).makeInvoice(args)),
          signMessage: msg => barrierWebLn(() => unwrap(window.webln).signMessage(msg)),
          verifyMessage: (sig, msg) => barrierWebLn(() => unwrap(window.webln).verifyMessage(sig, msg)),
          sendPayment: pr => barrierWebLn(() => unwrap(window.webln).sendPayment(pr)),
        } as WebLN)
      : null;

  useEffect(() => {
    if (maybeWebLn && !maybeWebLn.enabled && enable) {
      maybeWebLn.enable().catch(() => {
        console.debug("Couldn't enable WebLN");
      });
    }
  }, [maybeWebLn, enable]);

  return maybeWebLn;
}
