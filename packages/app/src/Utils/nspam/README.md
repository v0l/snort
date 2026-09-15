# nspam

On-device reply spam classifier, a JS port of [barrydeen/nspam](https://huggingface.co/barrydeen/nspam) v2.4
(LightGBM over hashed char/word n-grams plus structural features).

## Files

| file | purpose |
|---|---|
| `murmur3.ts` | MurmurHash3 x86 32-bit, matching sklearn's `FeatureHasher` bucketing |
| `features.ts` | feature extraction: `char_wb` 3-5 grams, word 1-2 grams, 17 structural + 6 group features |
| `model.ts` | reader and predictor for the binary model, plus isotonic calibration |
| `index.ts` | public API, per-event score cache |
| `cache.ts` | IndexedDB store of `{id, score, model}` |
| `../../assets/nspam-v2.4.bin` | 500 trees, 31000 nodes, 855 kB (402 kB gzipped) |

## Regenerating the model

```bash
bun packages/app/scripts/nspam-convert.ts v2.4
```

Downloads `model.txt` + `calibration.npz` from Hugging Face and writes the binary. Bump the
version string in `index.ts` at the same time so cached scores are invalidated.

## Feature layout

Feature indices, matching `config.json` from the model repo:

```
[0, 131072)        char_wb 3-5 grams, original case, NFKC, invisible chars stripped
[131072, 262144)   word 1-2 grams, lowercased
[262144, 262161)   17 structural features, averaged over the bundle
[262161, 262167)   6 group features
```

Hashed text counts are summed over the bundle, structural features averaged. Signs come from
the hash (`alternate_sign`), so colliding grams can cancel.

## Parity

The reference feature extractor is not published, so the exact definitions were recovered from
`parity_fixtures.jsonl` and `hash_fixtures.jsonl` (both committed under `packages/app/tests/fixtures/`).
43 of 50 fixtures reproduce the reference margin exactly, the rest are within 0.17 in logit space
and all 50 calibrated scores land within 0.02 of the reference. The remaining gap is in rare cases:
emoji sequences with modifiers or ZWJ, and `dup_body_bucket`, which the reference extractor appears
to emit as 0 at inference time.

Scoring costs about 0.15 ms for a single reply and 0.6 ms for a 10-reply bundle, so it runs on the
main thread.
