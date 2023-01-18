import "./Zap.css";
import * as secp from "@noble/secp256k1";
import { useMemo } from "react";
// @ts-expect-error
import { decode as invoiceDecode } from "light-bolt11-decoder";

import { sha256 } from "../Util";
import { formatShort } from "../Number";
import { HexKey, TaggedRawEvent } from "../nostr";
import Text from "./Text";
import ProfileImage from "./ProfileImage";

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
  const hash = decoded.sections.find((section: any) => section.name === 'payment_hash')?.value
  const description = decoded.sections.find((section: any) => section.name === 'description')?.letters

  return { amount, hash: secp.utils.bytesToHex(hash), description }
}

function getZapper(zap: TaggedRawEvent) {
  const rawDescription = findTag(zap, 'description')
  if (rawDescription) {
    const description = JSON.parse(rawDescription)
    const nostr = description?.find((c: string[]) => c[0] === 'application/nostr')
    return nostr && nostr[1]?.pubkey
  }
}

interface ParsedZap {
  id: HexKey
  e?: HexKey
  p: HexKey
  amount: number
  content: string
  zapper: HexKey // todo: anon
  description?: string
  valid: boolean
}

export function parseZap(zap: TaggedRawEvent): ParsedZap {
  const { amount, description, hash } = getInvoice(zap)
  const preimage = findTag(zap, 'preimage')
  const isValidPreimage = preimage && sha256(preimage) === hash
  const zapper = getZapper(zap)
  const e = findTag(zap, 'e')
  const p = findTag(zap, 'p')!
  return {
    id: zap.id,
    e,
    p,
    amount: Number(amount) / 1000,
    zapper,
    description,
    content: zap.content,
    valid: Boolean(isValidPreimage),
  }
}

interface ZapProps {
  zap: ParsedZap
}

const Zap = ({ zap }: ZapProps) => {
  const { amount, content, zapper, valid }  = zap

  return valid ? (
    <div className="zap">
      <div className="summary">
         <ProfileImage pubkey={zapper} />
         <div className="amount">
           <span className="amount-number">{formatShort(amount)}</span> sats
         </div>
       </div>
      <div className="body">
        <Text content={content} />
      </div>
    </div>
  ) : null
}

interface ZapsSummaryProps { zaps: ParsedZap[] }

export const ZapsSummary = ({ zaps } : ZapsSummaryProps) => {
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
              {content && <Text content={content} />}
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
