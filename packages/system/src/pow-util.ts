import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export interface NostrPowEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: Array<Array<string>>;
  content: string;
  sig: string;
}

export function minePow(e: NostrPowEvent, target: number) {
  let ctr = 0;

  let nonceTagIdx = e.tags.findIndex(a => a[0] === "nonce");
  if (nonceTagIdx === -1) {
    nonceTagIdx = e.tags.length;
    e.tags.push(["nonce", ctr.toString(), target.toString()]);
  }
  do {
    e.tags[nonceTagIdx][1] = (++ctr).toString();
    e.id = createId(e);
  } while (countLeadingZeros(e.id) < target);

  return e;
}

function createId(e: NostrPowEvent) {
  const payload = [0, e.pubkey, e.created_at, e.kind, e.tags, e.content];
  return bytesToHex(sha256(utf8ToBytes(JSON.stringify(payload))));
}

export function countLeadingZeros(hex: string) {
  let count = 0;

  for (let i = 0; i < hex.length; i++) {
    const nibble = parseInt(hex[i], 16);
    if (nibble === 0) {
      count += 4;
    } else {
      count += Math.clz32(nibble) - 28;
      break;
    }
  }

  return count;
}
