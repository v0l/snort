import * as secp from "@noble/secp256k1";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react"

import { sha256 } from "../Hash";
import "./Zap.css";
// @ts-expect-error
import { decode as invoiceDecode } from "light-bolt11-decoder";

import { TaggedRawEvent } from "../nostr";
import { eventLink } from "../Util";
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

interface ZapProps {
  zap: TaggedRawEvent
}

export function parseZap(zap: TaggedRawEvent) {
  const { amount, description, hash } = getInvoice(zap)
  const preimage = findTag(zap, 'preimage')
  const isValidPreimage = preimage && sha256(preimage) === hash
  const zapper = getZapper(zap)
  const e = findTag(zap, 'e')
  const p = findTag(zap, 'p')
  return { e, p, amount: Number(amount) / 1000, zapper, description, valid: isValidPreimage }
}

const Zap = ({ zap }: ZapProps) => {
  const { content, pubkey } = zap
  const { e, amount, zapper, description }  = parseZap(zap) ?? {}
  const isValid = amount && zapper

  return isValid ? (
    <div className="zap">
      <div className="summary">
         <ProfileImage pubkey={zapper} />
         <div className="amount">
           {amount} sats
         </div>
       </div>
      <div className="body">
        <Text content={content} />
        {e && (
          <Link
            key={e}
            to={eventLink(e)}
            onClick={(e) => e.stopPropagation()}
          >#{e}</Link>
        )}
      </div>
    </div>
  ) : null
}

export default Zap
