"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flatMerge = exports.filterIncludes = exports.simpleMerge = exports.mergeSimilar = exports.canMergeFilters = void 0;
const Util_1 = require("./Util");
/**
 * Keys which can change the entire meaning of the filter outside the array types
 */
const DiscriminatorKeys = ["since", "until", "limit", "search"];
function canMergeFilters(a, b) {
    const aObj = a;
    const bObj = b;
    for (const key of DiscriminatorKeys) {
        if (key in aObj || key in bObj) {
            if (aObj[key] !== bObj[key]) {
                return false;
            }
        }
    }
    return (0, Util_1.distance)(aObj, bObj) <= 1;
}
exports.canMergeFilters = canMergeFilters;
function mergeSimilar(filters) {
    console.time("mergeSimilar");
    const ret = [];
    const fCopy = [...filters];
    while (fCopy.length > 0) {
        const current = fCopy.shift();
        const mergeSet = [current];
        for (let i = 0; i < fCopy.length; i++) {
            const f = fCopy[i];
            if (mergeSet.every(v => canMergeFilters(v, f))) {
                mergeSet.push(fCopy.splice(i, 1)[0]);
                i--;
            }
        }
        ret.push(simpleMerge(mergeSet));
    }
    console.timeEnd("mergeSimilar");
    return ret;
}
exports.mergeSimilar = mergeSimilar;
/**
 * Simply flatten all filters into one
 * @param filters
 * @returns
 */
function simpleMerge(filters) {
    const result = {};
    filters.forEach(filter => {
        Object.entries(filter).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                if (result[key] === undefined) {
                    result[key] = [...value];
                }
                else {
                    result[key] = [...new Set([...result[key], ...value])];
                }
            }
            else {
                result[key] = value;
            }
        });
    });
    return result;
}
exports.simpleMerge = simpleMerge;
/**
 * Check if a filter includes another filter, as in the bigger filter will include the same results as the samller filter
 * @param bigger
 * @param smaller
 * @returns
 */
function filterIncludes(bigger, smaller) {
    const outside = bigger;
    for (const [k, v] of Object.entries(smaller)) {
        if (outside[k] === undefined) {
            return false;
        }
        if (Array.isArray(v) && v.some(a => !outside[k].includes(a))) {
            return false;
        }
        if (typeof v === "number") {
            if (k === "since" && outside[k] > v) {
                return false;
            }
            if (k === "until" && outside[k] < v) {
                return false;
            }
            // limit cannot be checked and is ignored
        }
    }
    return true;
}
exports.filterIncludes = filterIncludes;
/**
 * Merge expanded flat filters into combined concise filters
 * @param all
 * @returns
 */
function flatMerge(all) {
    console.time("flatMerge");
    let ret = [];
    // to compute filters which can be merged we need to calucate the distance change between each filter
    // then we can merge filters which are exactly 1 change diff from each other
    function mergeFiltersInSet(filters) {
        const result = {};
        filters.forEach(f => {
            const filter = f;
            Object.entries(filter).forEach(([key, value]) => {
                if (!DiscriminatorKeys.includes(key)) {
                    if (result[key] === undefined) {
                        result[key] = [value];
                    }
                    else {
                        result[key] = [...new Set([...result[key], value])];
                    }
                }
                else {
                    result[key] = value;
                }
            });
        });
        return result;
    }
    // reducer, kinda verbose
    while (all.length > 0) {
        const currentFilter = all.shift();
        const mergeSet = [currentFilter];
        for (let i = 0; i < all.length; i++) {
            const f = all[i];
            if (mergeSet.every(a => canMergeFilters(a, f))) {
                mergeSet.push(all.splice(i, 1)[0]);
                i--;
            }
        }
        ret.push(mergeFiltersInSet(mergeSet));
    }
    while (true) {
        const n = mergeSimilar([...ret]);
        if (n.length === ret.length) {
            break;
        }
        ret = n;
    }
    console.timeEnd("flatMerge");
    console.debug(ret);
    return ret;
}
exports.flatMerge = flatMerge;
//# sourceMappingURL=RequestMerger.js.map