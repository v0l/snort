
declare module "light-bolt11-decoder" {
    export function decode(pr?: string): ParsedInvoice;

    export interface ParsedInvoice {
        paymentRequest: string;
        sections: Section[];
    }

    export interface Section {
        name: string;
        value: string | Uint8Array | number | undefined;
    }
}
