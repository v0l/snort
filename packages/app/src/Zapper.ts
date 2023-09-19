import { LNURL } from "@snort/shared";
import {
  EventPublisher,
  NostrEvent,
  NostrLink,
  SystemInterface
} from "@snort/system";
import { generateRandomKey } from "Login";
import { isHex } from "SnortUtils";
import { LNWallet, WalletInvoiceState } from "Wallet";

export interface ZapTarget {
  type: "lnurl" | "pubkey";
  value: string;
  weight: number;
  memo?: string;
  name?: string;
  zap?: {
    pubkey: string;
    anon: boolean;
    event?: NostrLink;
  };
}

export interface ZapTargetResult {
  target: ZapTarget;
  paid: boolean;
  sent: number;
  fee: number;
  pr: string;
  error?: Error;
}

interface ZapTargetLoaded {
  target: ZapTarget;
  svc?: LNURL;
}

export class Zapper {
  #inProgress = false;
  #loadedTargets?: Array<ZapTargetLoaded>;

  constructor(
    readonly system: SystemInterface,
    readonly publisher?: EventPublisher,
    readonly onResult?: (r: ZapTargetResult) => void,
  ) {}

  /**
   * Create targets from Event
   */
  static fromEvent(ev: NostrEvent) {
    return ev.tags
      .filter(a => a[0] === "zap")
      .map(v => {
        if (v[1].length === 64 && isHex(v[1]) && v.length === 4) {
          // NIP-57.G
          return {
            type: "pubkey",
            value: v[1],
            weight: Number(v[3] ?? 0),
            zap: {
              pubkey: v[1],
              event: NostrLink.fromEvent(ev),
            },
          } as ZapTarget;
        } else {
          // assume event specific zap target
          return {
            type: "lnurl",
            value: v[1],
            weight: 1,
            zap: {
              pubkey: ev.pubkey,
              event: NostrLink.fromEvent(ev),
            },
          } as ZapTarget;
        }
      });
  }

  async send(wallet: LNWallet | undefined, targets: Array<ZapTarget>, amount: number) {
    if (this.#inProgress) {
      throw new Error("Payout already in progress");
    }
    this.#inProgress = true;

    const total = targets.reduce((acc, v) => (acc += v.weight), 0);
    const ret = [] as Array<ZapTargetResult>;

    for (const t of targets) {
      const toSend = Math.floor(amount * (t.weight / total));
      try {
        const svc = await this.#getService(t);
        if (!svc) {
          throw new Error(`Failed to get invoice from ${t.value}`);
        }
        const relays = this.system.Sockets.filter(a => !a.ephemeral).map(v => v.address);
        const pub = t.zap?.anon ?? false ? EventPublisher.privateKey(generateRandomKey().privateKey) : this.publisher;
        const zap =
          t.zap && svc.canZap
            ? await pub?.zap(toSend * 1000, t.zap.pubkey, relays, undefined, t.memo, eb => {
                if (t.zap?.event) {
                  const tag = t.zap.event.toEventTag();
                  if (tag) {
                    eb.tag(tag);
                  }
                }
                if (t.zap?.anon) {
                  eb.tag(["anon", ""]);
                }
                return eb;
              })
            : undefined;
        const invoice = await svc.getInvoice(toSend, t.memo, zap);
        if (invoice?.pr) {
          const res = await wallet?.payInvoice(invoice.pr);
          ret.push({
            target: t,
            paid: res?.state === WalletInvoiceState.Paid,
            sent: toSend,
            pr: invoice.pr,
            fee: res?.fees ?? 0,
          });
          this.onResult?.(ret[ret.length - 1]);
        } else {
          throw new Error(`Failed to get invoice from ${t.value}`);
        }
      } catch (e) {
        ret.push({
          target: t,
          paid: false,
          sent: 0,
          fee: 0,
          pr: "",
          error: e as Error,
        });
        this.onResult?.(ret[ret.length - 1]);
      }
    }

    this.#inProgress = false;
    return ret;
  }

  async load(targets: Array<ZapTarget>) {
    const svcs = targets.map(async a => {
      return {
        target: a,
        loading: await this.#getService(a),
      };
    });
    const loaded = await Promise.all(svcs);
    this.#loadedTargets = loaded.map(a => ({
      target: a.target,
      svc: a.loading,
    }));
  }

  /**
   * Any target supports zaps
   */
  canZap() {
    return this.#loadedTargets?.some(a => a.svc?.canZap ?? false);
  }

  /**
   * Max comment length which can be sent to all (smallest comment length)
   */
  maxComment() {
    return (
      this.#loadedTargets
        ?.map(a => (a.svc?.canZap ? 255 : a.svc?.maxCommentLength ?? 0))
        .reduce((acc, v) => (acc > v ? v : acc), 255) ?? 0
    );
  }

  /**
   * Max of the min amounts
   */
  minAmount() {
    return this.#loadedTargets?.map(a => a.svc?.min ?? 0).reduce((acc, v) => (acc < v ? v : acc), 1000) ?? 0;
  }

  /**
   * Min of the max amounts
   */
  maxAmount() {
    return this.#loadedTargets?.map(a => a.svc?.max ?? 100e9).reduce((acc, v) => (acc > v ? v : acc), 100e9) ?? 0;
  }

  async #getService(t: ZapTarget) {
    try {
      if (t.type === "lnurl") {
        const svc = new LNURL(t.value);
        await svc.load();
        return svc;
      } else if (t.type === "pubkey") {
        const profile = await this.system.ProfileLoader.fetchProfile(t.value);
        if (profile) {
          const svc = new LNURL(profile.lud16 ?? profile.lud06 ?? "");
          await svc.load();
          return svc;
        }
      }
    }catch {
      // nothing
    }
  }
}
