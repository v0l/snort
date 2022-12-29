import Event from "./Event";

export default class Thread {
    constructor() {
        /** @type {Tag} */
        this.Root = null;
        /** @type {Tag} */
        this.ReplyTo = null;
        /** @type {Array<Tag>} */
        this.Mentions = [];
        /** @type {Event} */
        this.Reply = null;
        /** @type {Array<String>} */
        this.PubKeys = [];
    }

    /**
     * Extract thread information from an Event
     * @param {Event} ev Event to extract thread from
     */
    static ExtractThread(ev) {
        let isThread = ev.Tags.some(a => a.Key === "e");
        if (!isThread) {
            return null;
        }

        let ret = new Thread();
        ret.Reply = ev;
        let eTags = ev.Tags.filter(a => a.Key === "e");
        let marked = eTags.some(a => a.Marker !== null);
        if (!marked) {
            ret.Root = eTags[0];
            if (eTags.length > 2) {
                ret.Mentions = eTags.slice(1, -1);
            }
            ret.ReplyTo = eTags[eTags.length - 1];
        } else {
            let root = eTags.find(a => a.Marker === "root");
            let reply = eTags.find(a => a.Marker === "reply");
            ret.Root = root;
            ret.ReplyTo = reply;
            ret.Mentions = eTags.filter(a => a.Marker === "mention");
        }
        ret.PubKeys = ev.Tags.filter(a => a.Key === "p").map(a => a.PubKey);

        return ret;
    }
}