import { EventKind, HexKey, NostrPrefix, NostrEvent, EventSigner, PowMiner } from ".";
import { HashtagRegex, MentionNostrEntityRegex } from "./const";
import { getPublicKey, jitter, unixNow } from "@snort/shared";
import { EventExt } from "./event-ext";
import { NostrLink, tryParseNostrLink } from "./nostr-link";

export class EventBuilder {
  #kind?: EventKind;
  #content?: string;
  #createdAt?: number;
  #pubkey?: string;
  #tags: Array<Array<string>> = [];
  #pow?: number;
  #powMiner?: PowMiner;
  #jitter?: number;

  /**
   * Populate builder with values from link
   */
  fromLink(link: NostrLink) {
    if (link.kind) {
      this.#kind = link.kind;
    }
    if (link.author) {
      this.#pubkey = link.author;
    }
    if (link.type === NostrPrefix.Address && link.id) {
      this.tag(["d", link.id]);
    }
  }

  jitter(n: number) {
    this.#jitter = n;
    return this;
  }

  kind(k: EventKind) {
    this.#kind = k;
    return this;
  }

  content(c: string) {
    this.#content = c;
    return this;
  }

  createdAt(n: number) {
    this.#createdAt = n;
    return this;
  }

  pubKey(k: string) {
    this.#pubkey = k;
    return this;
  }

  tag(t: Array<string>): EventBuilder {
    const duplicate = this.#tags.some(a => a.length === t.length && a.every((b, i) => b !== a[i]));
    if (duplicate) return this;
    this.#tags.push(t);
    return this;
  }

  pow(target: number, miner?: PowMiner) {
    this.#pow = target;
    this.#powMiner = miner ?? {
      minePow: (ev, target) => {
        EventExt.minePow(ev, target);
        return Promise.resolve(ev);
      },
    };
    return this;
  }

  /**
   * Extract mentions
   */
  processContent() {
    if (this.#content) {
      this.#content = this.#content.replace(MentionNostrEntityRegex, m => this.#replaceMention(m));

      const hashTags = [...this.#content.matchAll(HashtagRegex)];
      hashTags.map(hashTag => {
        this.#addHashtag(hashTag[0]);
      });
    }
    return this;
  }

  build() {
    this.#validate();
    const ev = {
      id: "",
      pubkey: this.#pubkey ?? "",
      content: this.#content ?? "",
      kind: this.#kind,
      created_at: (this.#createdAt ?? unixNow()) + (this.#jitter ? jitter(this.#jitter) : 0),
      tags: this.#tags.sort((a, b) => a[0].localeCompare(b[0])),
    } as NostrEvent;
    ev.id = EventExt.createId(ev);
    return ev;
  }

  /**
   * Build and sign event
   * @param pk Private key to sign event with
   */
  async buildAndSign(pk: HexKey | EventSigner) {
    if (typeof pk === "string") {
      const ev = this.pubKey(getPublicKey(pk)).build();
      return EventExt.sign(await this.#mine(ev), pk);
    } else {
      const ev = this.pubKey(await pk.getPubKey()).build();
      return await pk.sign(await this.#mine(ev));
    }
  }

  async #mine(ev: NostrEvent) {
    if (this.#pow && this.#powMiner) {
      const ret = await this.#powMiner.minePow(ev, this.#pow);
      return ret;
    }
    return ev;
  }

  #validate() {
    if (this.#kind === undefined) {
      throw new Error("Kind must be set");
    }
    if (this.#pubkey === undefined) {
      throw new Error("Pubkey must be set");
    }
  }

  #replaceMention(match: string) {
    const npub = match.slice(1);
    const link = tryParseNostrLink(npub);
    if (link) {
      if (link.type === NostrPrefix.Profile || link.type === NostrPrefix.PublicKey) {
        this.tag(["p", link.id]);
      }
      return `nostr:${link.encode()}`;
    } else {
      return match;
    }
  }

  #addHashtag(match: string) {
    const tag = match.slice(1);
    this.tag(["t", tag.toLowerCase()]);
  }
}
