"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffFilters = void 0;
const Util_1 = require("./Util");
const RequestExpander_1 = require("./RequestExpander");
const RequestMerger_1 = require("./RequestMerger");
function diffFilters(prev, next) {
    const prevExpanded = prev.flatMap(RequestExpander_1.expandFilter);
    const nextExpanded = next.flatMap(RequestExpander_1.expandFilter);
    const added = (0, RequestMerger_1.flatMerge)(nextExpanded.filter(a => !prevExpanded.some(b => (0, Util_1.deepEqual)(a, b))));
    const removed = (0, RequestMerger_1.flatMerge)(prevExpanded.filter(a => !nextExpanded.some(b => (0, Util_1.deepEqual)(a, b))));
    return {
        added,
        removed,
        changed: added.length > 0 || removed.length > 0,
    };
}
exports.diffFilters = diffFilters;
//# sourceMappingURL=RequestSplitter.js.map