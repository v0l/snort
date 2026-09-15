import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { charWbNgrams, extractFeatures, N_CHAR, N_WORD, wordNgrams } from "../src/Utils/nspam/features"
import { NspamModel } from "../src/Utils/nspam/model"
import { hashBucket } from "../src/Utils/nspam/murmur3"

const here = join(import.meta.dir, "fixtures")
const readJsonl = (name: string) =>
  readFileSync(join(here, name), "utf-8")
    .trim()
    .split("\n")
    .map(l => JSON.parse(l))

function buckets(grams: string[], n: number) {
  const m = new Map<number, number>()
  for (const g of grams) {
    const { index, sign } = hashBucket(g, n)
    m.set(index, (m.get(index) ?? 0) + sign)
  }
  return [...m.entries()].filter(([, v]) => v !== 0).sort((a, b) => a[0] - b[0])
}

describe("nspam hashing", () => {
  // fixtures are truncated to the first 32 buckets by the model publisher
  const trim = <T>(a: T[]) => a.slice(0, 32)

  test.each(readJsonl("nspam-hash.jsonl"))("hashes %p", fixture => {
    const { token, word_buckets, char_wb_buckets } = fixture
    expect(trim(buckets(wordNgrams(token), N_WORD))).toEqual(
      word_buckets.map((b: { index: number; value: number }) => [b.index, b.value]),
    )
    expect(trim(buckets(charWbNgrams(token), N_CHAR))).toEqual(
      char_wb_buckets.map((b: { index: number; value: number }) => [b.index, b.value]),
    )
  })
})

describe("nspam scoring", () => {
  const model = new NspamModel(
    readFileSync(join(import.meta.dir, "..", "src", "assets", "nspam-v2.4.bin")).buffer as ArrayBuffer,
  )
  const fixtures = readJsonl("nspam-parity.jsonl")

  test("matches the reference calibrated score", () => {
    for (const f of fixtures) {
      const { calibrated } = model.score(extractFeatures(f.notes))
      expect(Math.abs(calibrated - f.expected_calibrated_score)).toBeLessThan(0.02)
    }
  })

  test("reproduces the reference raw score", () => {
    const logit = (p: number) => Math.log(p / (1 - p))
    const errors = fixtures.map(f =>
      Math.abs(model.rawMargin(extractFeatures(f.notes)) - logit(f.expected_raw_score)),
    )
    const exact = errors.filter(e => e < 1e-6).length
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length
    // the reference feature extractor is not published, a handful of rare structural
    // features (emoji sequences, duplicate-body bucketing) are reproduced approximately
    expect(exact).toBeGreaterThanOrEqual(43)
    expect(mean).toBeLessThan(0.02)
    expect(Math.max(...errors)).toBeLessThan(0.25)
  })

  test("classifies the labelled fixtures", () => {
    const correct = fixtures.filter(
      f => (model.score(extractFeatures(f.notes)).calibrated >= 0.5 ? 1 : 0) === f.label,
    ).length
    expect(correct / fixtures.length).toBeGreaterThanOrEqual(0.9)
  })
})
