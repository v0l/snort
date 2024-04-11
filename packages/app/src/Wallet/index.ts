import { ExternalStore, unwrap } from "@snort/shared";
import { LNWallet, loadWallet, WalletInfo, WalletKind } from "@snort/wallet";
import { useEffect, useSyncExternalStore } from "react";

export interface WalletConfig {
    id: string;
    kind: WalletKind;
    active: boolean;
    info: WalletInfo;

    /**
     * Opaque string for wallet config
     */
    data?: string;
}

export interface WalletStoreSnapshot {
    configs: Array<WalletConfig>;
    config?: WalletConfig;
    wallet?: LNWallet;
}

export class WalletStore extends ExternalStore<WalletStoreSnapshot> {
    #configs: Array<WalletConfig>;
    #instance: Map<string, LNWallet>;

    constructor() {
        super();
        this.#configs = [];
        this.#instance = new Map();
        this.load(false);
        this.notifyChange();
    }

    list() {
        return Object.freeze([...this.#configs]);
    }

    get() {
        const activeConfig = this.#configs.find(a => a.active);
        if (!activeConfig) {
            if (this.#configs.length === 0) {
                return undefined;
            }
            throw new Error("No active wallet config");
        }
        if (this.#instance.has(activeConfig.id)) {
            return unwrap(this.#instance.get(activeConfig.id));
        } else {
            const w = this.#activateWallet(activeConfig);
            if (w) {
                if ("then" in w) {
                    w.then(async wx => {
                        this.#instance.set(activeConfig.id, wx);
                        this.notifyChange();
                    });
                    return undefined;
                } else {
                    this.#instance.set(activeConfig.id, w);
                    this.notifyChange();
                }
                return w;
            } else {
                throw new Error("Unable to activate wallet config");
            }
        }
    }

    add(cfg: WalletConfig) {
        this.#configs.push(cfg);
        this.save();
    }

    remove(id: string) {
        const idx = this.#configs.findIndex(a => a.id === id);
        if (idx === -1) {
            throw new Error("Wallet not found");
        }
        const [removed] = this.#configs.splice(idx, 1);
        if (removed.active && this.#configs.length > 0) {
            this.#configs[0].active = true;
        }
        this.save();
    }

    switch(id: string) {
        this.#configs.forEach(a => (a.active = a.id === id));
        this.save();
    }

    save() {
        const json = JSON.stringify(this.#configs);
        window.localStorage.setItem("wallet-config", json);
        this.notifyChange();
    }

    load(snapshot = true) {
        const cfg = window.localStorage.getItem("wallet-config");
        if (cfg) {
            this.#configs = JSON.parse(cfg);
        }
        if (snapshot) {
            this.notifyChange();
        }
    }

    free() {
        this.#instance.forEach(w => w.close());
    }

    takeSnapshot(): WalletStoreSnapshot {
        return {
            configs: [...this.#configs],
            config: this.#configs.find(a => a.active),
            wallet: this.get(),
        } as WalletStoreSnapshot;
    }

    #activateWallet(cfg: WalletConfig): LNWallet | Promise<LNWallet> | undefined {
        const w = loadWallet(cfg.kind, cfg.data);
        if (w) {
            w.on("change", d => this.#onWalletChange(cfg, d));
        }
        return w;
    }

    #onWalletChange(cfg: WalletConfig, data?: string) {
        if (data) {
            const activeConfig = this.#configs.find(a => a.id === cfg.id);
            if (activeConfig) {
                activeConfig.data = data;
            }
            this.save();
        } else {
            this.notifyChange();
        }
    }
}

export const Wallets = new WalletStore();
window.document.addEventListener("close", () => {
    Wallets.free();
});

export function useWallet() {
    const wallet = useSyncExternalStore<WalletStoreSnapshot>(
        h => Wallets.hook(h),
        () => Wallets.snapshot(),
    );
    useEffect(() => {
        if (wallet.wallet?.isReady() === false && wallet.wallet.canAutoLogin()) {
            wallet.wallet.login().catch(console.error);
        }
    }, [wallet]);
    return wallet;
}


/**
 * Adds a wallet config for WebLN if detected
 */
export function setupWebLNWalletConfig(store: WalletStore) {
    const wallets = store.list();

    const existing = wallets.find(a => a.kind === WalletKind.WebLN);
    if (window.webln && !existing) {
        const newConfig = {
            id: "webln",
            kind: WalletKind.WebLN,
            active: wallets.length === 0,
            info: {
                alias: "WebLN",
            },
        } as WalletConfig;
        store.add(newConfig);
    } else if (existing) {
        store.remove(existing.id);
    }
}
