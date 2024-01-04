import { UserCache } from "@/Cache";
import { LNURL, ExternalStore, unixNow } from "@snort/shared";
import { Toastore } from "@/Components/Toaster/Toaster";
import { LNWallet, WalletInvoiceState, Wallets } from "@/Wallet";
import { bech32ToHex, getDisplayName, trackEvent } from "@/Utils/index";
import { SnortPubKey } from "@/Utils/Const";

export enum ZapPoolRecipientType {
  Generic = 0,
  Relay = 1,
  FileHost = 2,
  DataProvider = 3,
}

export interface ZapPoolRecipient {
  type: ZapPoolRecipientType;
  pubkey: string;
  split: number;
  sum: number;
}

class ZapPool extends ExternalStore<Array<ZapPoolRecipient>> {
  #store = new Map<string, ZapPoolRecipient>();
  #isPayoutInProgress = false;
  #lastPayout = 0;

  constructor() {
    super();
    this.#load();
    setTimeout(() => this.#autoPayout().catch(console.error), 5_000);
  }

  async payout(wallet: LNWallet) {
    if (this.#isPayoutInProgress) {
      throw new Error("Payout already in progress");
    }
    this.#isPayoutInProgress = true;
    this.#lastPayout = unixNow();
    for (const x of this.#store.values()) {
      if (x.sum === 0) continue;
      try {
        const profile = await UserCache.get(x.pubkey);
        if (!profile) {
          throw new Error(`Failed to get profile for ${x.pubkey}`);
        }
        const svc = new LNURL(profile.lud16 || profile.lud06 || "");
        await svc.load();
        const amtSend = x.sum;
        const invoice = await svc.getInvoice(amtSend, `SnortZapPool: ${x.split}%`);
        if (invoice.pr) {
          const result = await wallet.payInvoice(invoice.pr);
          console.debug("ZPC", invoice, result);
          if (result.state === WalletInvoiceState.Paid) {
            x.sum -= amtSend;
            Toastore.push({
              element: `Sent ${amtSend.toLocaleString()} sats to ${getDisplayName(
                profile,
                x.pubkey,
              )} from your zap pool`,
              expire: unixNow() + 10,
              icon: "zap",
            });
          } else {
            throw new Error(`Failed to pay invoice, unknown reason`);
          }
        } else {
          throw new Error(invoice.reason ?? "Failed to get invoice");
        }
      } catch (e) {
        console.error(e);
        if (e instanceof Error) {
          const profile = UserCache.getFromCache(x.pubkey);
          Toastore.push({
            element: `Failed to send sats to ${getDisplayName(profile, x.pubkey)} (${
              e.message
            }), please try again later`,
            expire: unixNow() + 10,
            icon: "close",
          });
        }
      }
    }
    this.#save();
    this.notifyChange();
    this.#isPayoutInProgress = false;
  }

  calcAllocation(n: number) {
    let res = 0;
    for (const x of this.#store.values()) {
      res += Math.ceil(n * (x.split / 100));
    }
    return res;
  }

  allocate(n: number) {
    if (this.#isPayoutInProgress) {
      throw new Error("Payout is in progress, cannot allocate to pool");
    }
    for (const x of this.#store.values()) {
      x.sum += Math.ceil(n * (x.split / 100));
    }
    this.#save();
    this.notifyChange();
  }

  getOrDefault(rcpt: ZapPoolRecipient): ZapPoolRecipient {
    const k = this.#key(rcpt);
    const existing = this.#store.get(k);
    if (existing) {
      return { ...existing };
    }
    return rcpt;
  }

  set(rcpt: ZapPoolRecipient) {
    const k = this.#key(rcpt);
    // delete entry if split is 0 and sum is 0
    if (rcpt.split === 0 && rcpt.sum === 0 && this.#store.has(k)) {
      this.#store.delete(k);
    } else {
      this.#store.set(k, rcpt);
    }
    this.#save();
    this.notifyChange();
  }

  #key(rcpt: ZapPoolRecipient) {
    return `${rcpt.pubkey}-${rcpt.type}`;
  }

  #save() {
    self.localStorage.setItem("zap-pool", JSON.stringify(this.takeSnapshot()));
    self.localStorage.setItem("zap-pool-last-payout", this.#lastPayout.toString());
  }

  #load() {
    const existing = self.localStorage.getItem("zap-pool");
    if (existing) {
      const arr = JSON.parse(existing) as Array<ZapPoolRecipient>;
      this.#store = new Map(arr.map(a => [`${a.pubkey}-${a.type}`, a]));
    } else if (CONFIG.defaultZapPoolFee) {
      this.#store = new Map([
        [
          `${bech32ToHex(SnortPubKey)}-${ZapPoolRecipientType.Generic}`,
          {
            type: ZapPoolRecipientType.Generic,
            split: CONFIG.defaultZapPoolFee,
            pubkey: bech32ToHex(SnortPubKey),
            sum: 0,
          },
        ],
      ]);
    }

    const lastPayout = self.localStorage.getItem("zap-pool-last-payout");
    if (lastPayout) {
      this.#lastPayout = Number(lastPayout);
    }
  }

  async #autoPayout() {
    const payoutInterval = 60 * 60;
    try {
      if (this.#lastPayout < unixNow() - payoutInterval) {
        const wallet = Wallets.get();
        if (wallet) {
          if (wallet.canAutoLogin()) {
            await wallet.login();
          }
          trackEvent("ZapPool", { automatic: true });
          await this.payout(wallet);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => this.#autoPayout().catch(console.error), 60_000);
  }

  takeSnapshot(): ZapPoolRecipient[] {
    return [...this.#store.values()];
  }
}

export const ZapPoolController = CONFIG.features.zapPool ? new ZapPool() : undefined;
