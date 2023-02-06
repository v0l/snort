import "./Zap.css";
import { useMemo } from "react";
import { useSelector } from "react-redux";
// @ts-expect-error
import { decode as invoiceDecode } from "light-bolt11-decoder";
import { bytesToHex } from "@noble/hashes/utils";
import { sha256 } from "Util";

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

interface Zapper {
  pubkey?: HexKey,
  isValid: boolean
}

function getZapper(zap: TaggedRawEvent, dhash: string): Zapper {
  const zapRequest = findTag(zap, 'description')
  if (zapRequest) {
    const rawEvent: TaggedRawEvent = JSON.parse(zapRequest);
    if (Array.isArray(rawEvent)) {
      // old format, ignored
      return { isValid: false };
    }
    const metaHash = sha256(zapRequest);
    const ev = new Event(rawEvent)
    return { pubkey: ev.PubKey, isValid: dhash === metaHash };
  }
  return { isValid: false }
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
  const zapper = hash ? getZapper(zap, hash) : { isValid: false };
  const e = findTag(zap, 'e')
  const p = findTag(zap, 'p')!
  return {
    id: zap.id,
    e,
    p,
    amount: Number(amount) / 1000,
    zapper: zapper.pubkey,
    content: zap.content,
    valid: zapper.isValid,
  }
}

const Zap = ({ zap, showZapped = true }: { zap: ParsedZap, showZapped?: boolean }) => {
  const { amount, content, zapper, valid, p } = zap
  const pubKey = useSelector((s: RootState) => s.login.publicKey)

  return valid ? (
    <div className="zap note card">
      <div className="header">
        {zapper ? <ProfileImage pubkey={zapper} /> : <div>Anon&nbsp;</div>}
        {p !== pubKey && showZapped && <ProfileImage pubkey={p} />}
        <div className="amount">
          <span className="amount-number">{formatShort(amount)}</span> sats
        </div>
      </div>
      <div className="body">
        <Text
          creator={zapper || ""}
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
  const sortedZaps = useMemo(() => {
    const pub = [...zaps.filter(z => z.zapper)]
    const priv = [...zaps.filter(z => !z.zapper)]
    pub.sort((a, b) => b.amount - a.amount)
    return pub.concat(priv)
  }, [zaps])

  if (zaps.length === 0) {
    return null
  }

  const [topZap, ...restZaps] = sortedZaps
  const restZapsTotal = restZaps.reduce((acc, z) => acc + z.amount, 0)
  const { zapper, amount, content, valid } = topZap

  return (
    <div className="zaps-summary">
      {amount && (
        <div className={`top-zap`}>
          <div className="summary">
            {zapper && <ProfileImage pubkey={zapper} />}
            {restZaps.length > 0 && (
              <span>and {restZaps.length} other{restZaps.length > 1 ? 's' : ''}</span>
            )}
            <span>&nbsp;zapped</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Zap
