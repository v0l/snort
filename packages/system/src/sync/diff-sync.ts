import { EventBuilder, EventSigner, NostrLink, SystemInterface } from "..";
import { SafeSync } from "./safe-sync";
import debug from "debug";

interface TagDiff {
  type: "add" | "remove" | "replace";
  tag: Array<string> | Array<Array<string>>;
}

/**
 * Add/Remove tags from event
 */
export class DiffSyncTags {
  #log = debug("DiffSyncTags");
  #sync = new SafeSync();
  #changes: Array<TagDiff> = [];

  constructor(readonly link: NostrLink) {}

  /**
   * Add a tag
   */
  add(tag: Array<string> | Array<Array<string>>) {
    this.#changes.push({
      type: "add",
      tag,
    });
  }

  /**
   * Remove a tag
   */
  remove(tag: Array<string> | Array<Array<string>>) {
    this.#changes.push({
      type: "remove",
      tag,
    });
  }

  /**
   * Replace all the tags
   */
  replace(tag: Array<Array<string>>) {
    this.#changes.push({
      type: "replace",
      tag,
    });
  }

  /**
   * Apply changes and save
   */
  async persist(signer: EventSigner, system: SystemInterface, content?: string) {
    const cloneChanges = [...this.#changes];
    this.#changes = [];

    // always start with sync
    const res = await this.#sync.sync(this.link, system);

    let isNew = false;
    let next = res ? { ...res } : undefined;
    if (!next) {
      const eb = new EventBuilder();
      eb.fromLink(this.link);
      next = eb.build();
      isNew = true;
    }
    if (content) {
      next.content = content;
    }

    // apply changes onto next
    for (const change of cloneChanges) {
      for (const changeTag of Array.isArray(change.tag[0])
        ? (change.tag as Array<Array<string>>)
        : [change.tag as Array<string>]) {
        const existing = next.tags.findIndex(a => a.every((b, i) => changeTag[i] === b));
        switch (change.type) {
          case "add": {
            if (existing === -1) {
              next.tags.push(changeTag);
            } else {
              this.#log("Tag already exists: %O", changeTag);
            }
            break;
          }
          case "remove": {
            if (existing !== -1) {
              next.tags.splice(existing, 1);
            } else {
              this.#log("Could not find tag to remove: %O", changeTag);
            }
          }
        }
      }
    }

    await this.#sync.update(next, signer, system, !isNew);
  }
}
