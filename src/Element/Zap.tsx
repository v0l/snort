import "./Zap.css";
import { useMemo } from "react";
// @ts-expect-error
import { decode as invoiceDecode } from "light-bolt11-decoder";
import { bytesToHex } from "@noble/hashes/utils";

import { sha256 } from "Util";
import { formatShort } from "Number";
import { HexKey, TaggedRawEvent } from "Nostr";
import Event from "Nostr/Event";
import Text from "Element/Text";
import ProfileImage from "Element/ProfileImage";

function findTag(e: TaggedRawEvent, tag: string) {
  const maybeTag = e.tags.find((evTag) => {
    return evTag[0] === tag
  })
  return maybeTag && maybeTag[1]
}

type Section = {
  name: string
  value?: any
  letters?: string
}

function getSection(sections: Section[], name: string) {
  return sections.find((s) => s.name === name)
}

function getInvoice(zap: TaggedRawEvent) {
  const bolt11 = findTag(zap, 'bolt11')
  const decoded = invoiceDecode(bolt11)

  const amount = decoded.sections.find((section: any) => section.name === 'amount')?.value
  const hash = decoded.sections.find((section: any) => section.name === 'description_hash')?.value;

  return { amount, hash: hash ? bytesToHex(hash) : undefined };
}

function getZapper(zap: TaggedRawEvent, dhash: string) {
  const zapRequest = findTag(zap, 'description')
  if (zapRequest) {
    const rawEvent: TaggedRawEvent = JSON.parse(zapRequest);
    if (Array.isArray(rawEvent)) {
      // old format, ignored
      return;
    }
    const metaHash = sha256(zapRequest);
    const ev = new Event(rawEvent)
    return { pubkey: ev.PubKey, valid: metaHash == dhash };
  }
}

interface ParsedZap {
  id: HexKey
  e?: HexKey
  p: HexKey
  amount: number
  content: string
  zapper?: HexKey
  valid: boolean
}

export function parseZap(zap: TaggedRawEvent): ParsedZap {
  const { amount, hash } = getInvoice(zap)
  const zapper = hash ? getZapper(zap, hash) : { valid: false, pubkey: undefined };
  const e = findTag(zap, 'e')
  const p = findTag(zap, 'p')!
  return {
    id: zap.id,
    e,
    p,
    amount: Number(amount) / 1000,
    zapper: zapper?.pubkey,
    content: zap.content,
    valid: zapper?.valid ?? false,
  }
}

const Zap = ({ zap }: { zap: ParsedZap }) => {
  const { amount, content, zapper, valid } = zap

  return valid ? (
    <div className="zap">
      <div className="summary">
        {zapper && <ProfileImage pubkey={zapper} />}
        <div className="amount">
          <span className="amount-number">{formatShort(amount)}</span> sats
        </div>
      </div>
      <div className="body">
         <Text 
           creator={zapper!}
           content={content}
           tags={[]}
           users={new Map()}
         />
      </div>
    </div>
  ) : null
}

interface ZapsSummaryProps { zaps: ParsedZap[] }

export const ZapsSummary = ({ zaps }: ZapsSummaryProps) => {
  const zapTotal = zaps.reduce((acc, z) => acc + z.amount, 0)

  const topZap = zaps.length > 0 && zaps.reduce((acc, z) => {
    return z.amount > acc.amount ? z : acc
  })
  const restZaps = zaps.filter(z => topZap && z.id !== topZap.id)
  const restZapsTotal = restZaps.reduce((acc, z) => acc + z.amount, 0)
  const sortedZaps = useMemo(() => {
    const s = [...restZaps]
    s.sort((a, b) => b.amount - a.amount)
    return s
  }, [restZaps])
  const { zapper, amount, content, valid } = topZap || {}

  return (
    <div className="zaps-summary">
      {amount && valid && zapper && (
        <div className={`top-zap`}>
          <div className="summary">
            <ProfileImage pubkey={zapper} />
            <div className="amount">
              zapped <span className="amount-number">{formatShort(amount)}</span> sats
            </div>
          </div>
          <div className="body">
            {content &&  (
              <Text 
                creator={zapper}
                content={content}
                tags={[]}
                users={new Map()}
              />
            )}
          </div>
        </div>
      )}
      {restZapsTotal > 0 && (
        <div className="rest-zaps">
          {restZaps.length} other{restZaps.length > 1 ? 's' : ''} zapped&nbsp;
          <span className="amount-number">{formatShort(restZapsTotal)}</span> sats
        </div>
      )}
    </div>
  )
}

export default Zap
