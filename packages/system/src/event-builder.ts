import { EventKind, HexKey, NostrPrefix, NostrEvent, EventSigner } from ".";
import { HashtagRegex, MentionNostrEntityRegex } from "./const";
import { getPublicKey, unixNow } from "@snort/shared";
import { EventExt } from "./event-ext";
import { tryParseNostrLink } from "./nostr-link";

export class EventBuilder {
  #kind?: EventKind;
  #content?: string;
  #createdAt?: number;
  #pubkey?: string;
  #tags: Array<Array<string>> = [];

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
      created_at: this.#createdAt ?? unixNow(),
      tags: this.#tags,
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
      EventExt.sign(ev, pk);
      return ev;
    } else {
      const ev = this.pubKey(await pk.getPubKey()).build();
      return await pk.sign(ev);
    }
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
