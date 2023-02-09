import { u256 } from "Nostr";
import { default as NEvent } from "Nostr/Event";
import EventKind from "Nostr/EventKind";
import Tag from "Nostr/Tag";

export default class Thread {
  Root?: Tag;
  ReplyTo?: Tag;
  Mentions: Array<Tag>;
  PubKeys: Array<u256>;

  constructor() {
    this.Mentions = [];
    this.PubKeys = [];
  }

  /**
   * Extract thread information from an Event
   * @param ev Event to extract thread from
   */
  static ExtractThread(ev: NEvent) {
    const isThread = ev.Tags.some(a => a.Key === "e");
    if (!isThread) {
      return null;
    }

    const shouldWriteMarkers = ev.Kind === EventKind.TextNote;
    const ret = new Thread();
    const eTags = ev.Tags.filter(a => a.Key === "e");
    const marked = eTags.some(a => a.Marker !== undefined);
    if (!marked) {
      ret.Root = eTags[0];
      ret.Root.Marker = shouldWriteMarkers ? "root" : undefined;
      if (eTags.length > 1) {
        ret.ReplyTo = eTags[1];
        ret.ReplyTo.Marker = shouldWriteMarkers ? "reply" : undefined;
      }
      if (eTags.length > 2) {
        ret.Mentions = eTags.slice(2);
        if (shouldWriteMarkers) {
          ret.Mentions.forEach(a => (a.Marker = "mention"));
        }
      }
    } else {
      const root = eTags.find(a => a.Marker === "root");
      const reply = eTags.find(a => a.Marker === "reply");
      ret.Root = root;
      ret.ReplyTo = reply;
      ret.Mentions = eTags.filter(a => a.Marker === "mention");
    }
    ret.PubKeys = Array.from(new Set(ev.Tags.filter(a => a.Key === "p").map(a => <u256>a.PubKey)));
    return ret;
  }
}
