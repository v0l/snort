import "./Zap.css";
import { useSelector } from "react-redux";
// @ts-expect-error
import { decode as invoiceDecode } from "light-bolt11-decoder";
import { bytesToHex } from "@noble/hashes/utils";

//import { sha256 } from "Util";
import { formatShort } from "Number";
import { HexKey, TaggedRawEvent } from "Nostr";
import Event from "Nostr/Event";
import Text from "Element/Text";
import ProfileImage from "Element/ProfileImage";
import { RootState } from "State/Store";

function findTag(e: TaggedRawEvent, tag: string) {
  const maybeTag = e.tags.find((evTag) => {
    return evTag[0] === tag
  })
  return maybeTag && maybeTag[1]
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
      const rawDescriptionTag = rawEvent.find(a => a[0] === 'application/nostr')
      const rawDescription = rawDescriptionTag && rawDescriptionTag[1]
      const request = typeof rawDescription === 'string' ? JSON.parse(rawDescription) : rawDescription
      return request?.pubkey
    }
    //const metaHash = sha256(zapRequest);
    const ev = new Event(rawEvent)
    return ev.PubKey
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
  const zapper = hash && getZapper(zap, hash)
  const e = findTag(zap, 'e')
  const p = findTag(zap, 'p')!
  return {
    id: zap.id,
    e,
    p,
    amount: Number(amount) / 1000,
    zapper,
    content: zap.content,
    valid: true,
  }
}

const Zap = ({ zap, showZapped = true }: { zap: ParsedZap, showZapped?: boolean }) => {
  const { amount, content, zapper, valid, p } = zap
  const pubKey = useSelector((s: RootState) => s.login.publicKey)

  return valid ? (
    <div className="zap note card">
      <div className="header">
        {zapper && <ProfileImage pubkey={zapper} />}
        {p !== pubKey && showZapped && <ProfileImage pubkey={p} />}
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
  const topZap = zaps.length > 0 && zaps.reduce((acc, z) => {
    return z.amount > acc.amount ? z : acc
  })
  const restZaps = zaps.filter(z => topZap && z.id !== topZap.id)
  const restZapsTotal = restZaps.reduce((acc, z) => acc + z.amount, 0)
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
