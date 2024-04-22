import { EventEmitter } from "eventemitter3";
import { EventBuilder, EventSigner, NostrEvent, NostrLink, NotSignedNostrEvent, SystemInterface, Tag } from "..";
import { SafeSync, SafeSyncEvents } from "./safe-sync";
import debug from "debug";

interface TagDiff {
  type: "add" | "remove" | "replace" | "update";
  tag: Array<string> | Array<Array<string>>;
}

/**
 * Add/Remove tags from event
 */
export class DiffSyncTags extends EventEmitter<SafeSyncEvents> {
  #log = debug("DiffSyncTags");
  #sync: SafeSync;
  #changes: Array<TagDiff> = [];
  #changesEncrypted: Array<TagDiff> = [];
  #decryptedContent?: string;

  constructor(readonly link: NostrLink) {
    super();
    this.#sync = new SafeSync(link);
    this.#sync.on("change", () => {
      this.emit("change");
    });
  }

  /**
   * Get the raw storage event
   */
  get value() {
    return this.#sync.value;
  }

  /**
   * Get the current tag set
   */
  get tags() {
    const next = this.#nextEvent();
    return next.tags;
  }

  /**
   * Get decrypted content
   */
  get encryptedTags() {
    if (this.#decryptedContent) {
      const tags = JSON.parse(this.#decryptedContent) as Array<Array<string>>;
      return tags;
    }
    return [];
  }

  /**
   * Add a tag
   */
  add(tag: Array<string> | Array<Array<string>>, encrypted = false) {
    (encrypted ? this.#changesEncrypted : this.#changes).push({
      type: "add",
      tag,
    });
    this.emit("change");
  }

  /**
   * Remove a tag
   */
  remove(tag: Array<string> | Array<Array<string>>, encrypted = false) {
    (encrypted ? this.#changesEncrypted : this.#changes).push({
      type: "remove",
      tag,
    });
    this.emit("change");
  }

  /**
   * Update a tag (remove+add)
   */
  update(tag: Array<string> | Array<Array<string>>, encrypted = false) {
    (encrypted ? this.#changesEncrypted : this.#changes).push({
      type: "update",
      tag,
    });
    this.emit("change");
  }

  /**
   * Replace all the tags
   */
  replace(tag: Array<Array<string>>, encrypted = false) {
    (encrypted ? this.#changesEncrypted : this.#changes).push({
      type: "replace",
      tag,
    });
    this.emit("change");
  }

  async sync(signer: EventSigner, system: SystemInterface) {
    await this.#sync.sync(system);

    if (
      this.#sync.value?.content &&
      this.#sync.value?.content.startsWith("[") &&
      this.#sync.value?.content.endsWith("]")
    ) {
      const decrypted = await signer.nip4Decrypt(this.#sync.value.content, await signer.getPubKey());
      this.#decryptedContent = decrypted;
    }
  }

  /**
   * Apply changes and save
   */
  async persist(signer: EventSigner, system: SystemInterface, content?: string) {
    if (!this.#sync.didSync) {
      await this.sync(signer, system);
    }

    const isNew = this.#sync.value === undefined;
    const next = this.#nextEvent(content);
    // content is populated as tags, encrypt it
    if (next.content.length > 0 && !content) {
      next.content = await signer.nip4Encrypt(next.content, await signer.getPubKey());
    }
    await this.#sync.update(next, signer, system, !isNew);
  }

  #nextEvent(content?: string): NotSignedNostrEvent {
    if (content !== undefined && this.#changesEncrypted.length > 0) {
      throw new Error("Cannot have both encrypted tags and explicit content");
    }
    let isNew = false;
    let next = this.#sync.value ? { ...this.#sync.value } : undefined;
    if (!next) {
      const eb = new EventBuilder();
      eb.fromLink(this.link);
      next = eb.build();
      isNew = true;
    }

    // apply changes onto next
    this.#applyChanges(next.tags, this.#changes);
    if (this.#changesEncrypted.length > 0 && !content) {
      const encryptedTags = isNew ? [] : this.encryptedTags;
      this.#applyChanges(encryptedTags, this.#changesEncrypted);
      next.content = JSON.stringify(encryptedTags);
    } else if (content) {
      next.content = content;
    }

    return next;
  }

  #applyChanges(tags: Array<Array<string>>, changes: Array<TagDiff>) {
    for (const change of changes) {
      if (change.tag.length === 0 && change.type !== "replace") continue;

      switch (change.type) {
        case "add": {
          const changeTags = Array.isArray(change.tag[0])
            ? (change.tag as Array<Array<string>>)
            : [change.tag as Array<string>];
          for (const changeTag of changeTags) {
            const existing = tags.findIndex(a => change.tag[0] === a[0] && change.tag[1] === a[1]);
            if (existing === -1) {
              tags.push(changeTag);
            } else {
              this.#log("Tag already exists: %O", changeTag);
            }
          }
          break;
        }
        case "remove": {
          const changeTags = Array.isArray(change.tag[0])
            ? (change.tag as Array<Array<string>>)
            : [change.tag as Array<string>];
          for (const changeTag of changeTags) {
            const existing = tags.findIndex(a => change.tag[0] === a[0] && change.tag[1] === a[1]);
            if (existing !== -1) {
              tags.splice(existing, 1);
            } else {
              this.#log("Could not find tag to remove: %O", changeTag);
            }
          }
          break;
        }
        case "update": {
          const changeTags = Array.isArray(change.tag[0])
            ? (change.tag as Array<Array<string>>)
            : [change.tag as Array<string>];
          for (const changeTag of changeTags) {
            const existing = tags.findIndex(a => change.tag[0] === a[0] && change.tag[1] === a[1]);
            if (existing !== -1) {
              tags[existing] = changeTag;
            } else {
              this.#log("Could not find tag to update: %O", changeTag);
            }
          }
          break;
        }
        case "replace": {
          tags.splice(0, tags.length);
          tags.push(...(change.tag as Array<Array<string>>));
          break;
        }
      }
    }
  }
}
