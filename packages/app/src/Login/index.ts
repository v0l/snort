import { MultiAccountStore } from "./MultiAccountStore";
export const LoginStore = new MultiAccountStore();

export interface Nip7os {
    getPublicKey: () => string
    signEvent: (ev: string) => string
    saveKey: (key: string) => void
    nip04_encrypt: (content:string, to: string) => string
    nip04_decrypt: (content:string, from: string) => string
}

declare global {
    interface Window {
        nostr_os?: Nip7os;
    }
}

export * from "./Preferences";
export * from "./LoginSession";
export * from "./Functions";
