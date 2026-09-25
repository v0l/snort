import { unixNow } from "@snort/shared"
import { EventBuilder, type EventKind, type NostrEvent } from "@snort/system"

import { TestInvoice } from "./network"
import { walletService } from "./world"

export interface WalletLog {
  balanceMsats: number
  payments: Array<string>
  invoices: Array<{ amount: number; description?: string }>
}

const methods = ["get_info", "get_balance", "pay_invoice", "make_invoice", "list_transactions"]

async function handle(method: string, params: Record<string, unknown>, log: WalletLog) {
  switch (method) {
    case "get_info":
      return { alias: "e2e wallet", network: "mainnet", methods }
    case "get_balance":
      return { balance: log.balanceMsats }
    case "pay_invoice":
      log.payments.push(params.invoice as string)
      log.balanceMsats -= 2_500_000
      return { preimage: "00".repeat(32) }
    case "make_invoice":
      log.invoices.push({ amount: params.amount as number, description: params.description as string | undefined })
      return { type: "incoming", invoice: TestInvoice, payment_hash: "11".repeat(32), amount: params.amount }
    case "list_transactions":
      return {
        transactions: [
          {
            type: "incoming",
            invoice: TestInvoice,
            description: "coffee money",
            payment_hash: "22".repeat(32),
            amount: 5_000_000,
            fees_paid: 0,
            created_at: unixNow() - 3_600,
            settled_at: unixNow() - 3_600,
          },
        ],
      }
  }
}

export function walletResponder(log: WalletLog) {
  return async (ev: NostrEvent) => {
    if (ev.kind !== 23194 || !ev.tags.some(t => t[0] === "p" && t[1] === walletService.pubkey)) return []
    const { method, params } = JSON.parse(await walletService.signer.nip44Decrypt(ev.content, ev.pubkey))
    const result = await handle(method, params ?? {}, log)
    const body = result
      ? { result_type: method, result }
      : { result_type: method, error: { code: "NOT_IMPLEMENTED", message: method } }
    const eb = new EventBuilder()
      .kind(23195 as EventKind)
      .content(await walletService.signer.nip44Encrypt(JSON.stringify(body), ev.pubkey))
      .tag(["e", ev.id])
      .tag(["p", ev.pubkey])
    return [await eb.buildAndSign(walletService.signer)]
  }
}
