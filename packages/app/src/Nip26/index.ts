import * as secp from "@noble/secp256k1";

import { EventKind, HexKey } from "@snort/nostr";
import { sha256, unwrap } from "Util";

export interface DelegationData {
  delegatee: HexKey;
  delegator?: HexKey;
  sig?: string;
  kinds?: Array<EventKind>;
  createdBefore?: number;
  createdAfter?: number;
}

export function delegationToQuery(d: DelegationData) {
  const opt: Array<string> = [];
  if (d.kinds && d.kinds.length > 0) {
    opt.push(...d.kinds.map(v => `kind=${v}`));
  }
  if (d.createdAfter) {
    opt.push(`created_at>${d.createdAfter}`);
  }
  if (d.createdBefore) {
    opt.push(`created_at<${d.createdBefore}`);
  }

  if (opt.length === 0) {
    throw new Error("Invalid delegation data, no query");
  }
  return opt.join("&");
}

export function delegationToToken(d: DelegationData) {
  return `nostr:delegation:${d.delegatee}:${delegationToQuery(d)}`;
}

export function parseDelegationToken(s: string) {
  const sp = s.split(":");
  if (sp.length !== 4 || sp[0] !== "nostr" || sp[1] !== "delegation") {
    throw new Error("Invalid delegation token");
  }

  const delegatee = sp[2];
  const params = sp[3];
  if (delegatee.length !== 64) {
    throw new Error("Invalid delegation token, delegatee pubkey must be 64 char hex string");
  }

  const paramsSplit = params.split("&");

  const ret = {
    delegatee,
  } as DelegationData;

  for (const x of paramsSplit) {
    const xS = x.split(/[<>=]/);
    switch (xS[0]) {
      case "kind": {
        ret.kinds ??= [];
        ret.kinds.push(Number(xS[1]));
        break;
      }
      case "created_at": {
        const op = x.substring(10, 11);
        if (op === ">") {
          ret.createdAfter = Number(xS[1]);
        } else if (op === "<") {
          ret.createdBefore = Number(xS[1]);
        } else {
          throw new Error("Invalid delegation token, created_at operator must be '<' or '>'");
        }
        break;
      }
      default: {
        throw new Error(`Invalid delegation token, unknown param ${xS[0]}`);
      }
    }
  }

  return ret;
}

export function verifyDelegation(d: DelegationData) {
  const token = sha256(delegationToToken(d));
  console.debug(token);
  return secp.schnorr.verify(unwrap(d.sig), token, unwrap(d.delegator));
}
