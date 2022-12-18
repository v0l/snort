import Event from "./Event";

export default class Thread {
    constructor() {
        this.Root = null;
        this.ReplyTo = null;
        this.Mentions = [];
        this.Reply = null;
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
        }

        return ret;
    }
}