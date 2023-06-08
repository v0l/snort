"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandFilter = void 0;
/**
 * Expand a filter into its most fine grained form
 */
function expandFilter(f) {
    const ret = [];
    const src = Object.entries(f);
    const keys = src.filter(([, v]) => Array.isArray(v)).map(a => a[0]);
    const props = src.filter(([, v]) => !Array.isArray(v));
    function generateCombinations(index, currentCombination) {
        if (index === keys.length) {
            ret.push(currentCombination);
            return;
        }
        const key = keys[index];
        const values = f[key];
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            const updatedCombination = { ...currentCombination, [key]: value };
            generateCombinations(index + 1, updatedCombination);
        }
    }
    generateCombinations(0, {
        ...Object.fromEntries(props),
    });
    return ret;
}
exports.expandFilter = expandFilter;
//# sourceMappingURL=RequestExpander.js.map