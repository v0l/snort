import { hashBucket } from "./murmur3"

export const N_CHAR = 131072
export const N_WORD = 131072
export const CHAR_OFFSET = 0
export const WORD_OFFSET = N_CHAR
export const STRUCT_OFFSET = N_CHAR + N_WORD
export const GROUP_OFFSET = STRUCT_OFFSET + 17
export const N_FEATURES = GROUP_OFFSET + 6

export interface ScorableNote {
  content: string
  tags: string[][]
  created_at: number
}

/** Invisible codepoints listed in the model config, stripped before hashing */
const INVISIBLE = new Set([
  0x180e, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2060, 0x2061, 0x2062,
  0x2063, 0x2064, 0x2066, 0x2067, 0x2068, 0x2069, 0xfeff,
])

function countInvisible(text: string) {
  let n = 0
  for (const c of text) {
    if (INVISIBLE.has(c.codePointAt(0) ?? 0)) n++
  }
  return n
}

function stripInvisible(text: string) {
  let out = ""
  for (const c of text) {
    if (!INVISIBLE.has(c.codePointAt(0) ?? 0)) out += c
  }
  return out
}

/** sklearn token_pattern (?u)\b\w\w+\b */
const WORD_TOKEN = /[\p{L}\p{N}_]{2,}/gu
/** \w+ tokens, used for the group similarity features */
const WORD_ANY = /[\p{L}\p{N}_]+/gu
const URL_RE = /https?:\/\/[^\s<>"']+/gi
const HASHTAG = /#[\p{L}\p{N}_]+/gu
const NOSTR_URI = /nostr:[023456789acdefghjklmnpqrstuvwxyz]+/gi
const EMOJI = /\p{So}/gu
const PUNCT = /\p{P}/gu
const UPPER = /\p{Lu}/gu
const LETTER = /\p{L}/gu
const DIGIT = /\p{Nd}/gu

function countMatches(text: string, re: RegExp) {
  re.lastIndex = 0
  let n = 0
  while (re.exec(text) !== null) n++
  return n
}

/** Text as fed to the two hashing vectorizers */
export function normalizeText(content: string) {
  return stripInvisible(content.normalize("NFKC"))
}

export function wordNgrams(text: string): string[] {
  const tokens = text.match(WORD_TOKEN) ?? []
  const out: string[] = [...tokens]
  for (let i = 0; i + 1 < tokens.length; i++) {
    out.push(`${tokens[i]} ${tokens[i + 1]}`)
  }
  return out
}

/** sklearn CountVectorizer char_wb analyzer, codepoint aware */
export function charWbNgrams(text: string, minN = 3, maxN = 5): string[] {
  const out: string[] = []
  for (const word of text.split(/\s+/)) {
    if (word.length === 0) continue
    const cps = Array.from(` ${word} `)
    const len = cps.length
    for (let n = minN; n <= maxN; n++) {
      let offset = 0
      out.push(cps.slice(offset, offset + n).join(""))
      while (offset + n < len) {
        offset += 1
        out.push(cps.slice(offset, offset + n).join(""))
      }
      if (offset === 0) break
    }
  }
  return out
}

interface NoteFeatures {
  values: number[]
  tokens: Set<string>
  firstToken: string
  body: string
  lenChars: number
}

function structural(note: ScorableNote): NoteFeatures {
  const text = note.content ?? ""
  const zeroWidth = countInvisible(text.normalize("NFKC"))
  const lenChars = Array.from(text).length
  const wsTokens = text.split(/\s+/).filter(x => x.length > 0)

  const urls = text.match(URL_RE) ?? []
  const domains = new Set<string>()
  for (const u of urls) {
    try {
      domains.add(new URL(u).hostname.toLowerCase())
    } catch {
      // unparsable url, no domain to count
    }
  }

  let tagP = 0
  let tagE = 0
  let tagT = 0
  let tagOther = 0
  for (const t of note.tags ?? []) {
    if (t[0] === "p") tagP++
    else if (t[0] === "e") tagE++
    else if (t[0] === "t") tagT++
    else tagOther++
  }

  const emoji = countMatches(text, EMOJI)
  const letters = countMatches(text, LETTER)
  const den = lenChars || 1
  const lower = text.toLowerCase()
  const anyTokens = lower.match(WORD_ANY) ?? []

  return {
    values: [
      lenChars,
      wsTokens.length,
      urls.length,
      domains.size,
      countMatches(text, NOSTR_URI),
      countMatches(text, HASHTAG),
      tagP,
      tagE,
      tagT,
      tagOther,
      emoji,
      emoji / den,
      zeroWidth,
      letters === 0 ? 0 : countMatches(text, UPPER) / letters,
      countMatches(text, DIGIT) / den,
      countMatches(text, PUNCT) / den,
      // dup_body_bucket: the reference extractor emits 0 at inference time
      0,
    ],
    tokens: new Set(anyTokens),
    firstToken: anyTokens[0] ?? "",
    body: text.trim().toLowerCase(),
    lenChars,
  }
}

function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

/**
 * Sparse feature vector for a bundle of 1-10 replies by one author.
 * Hashed text features are summed over the bundle, structural features averaged.
 */
export function extractFeatures(notes: ReadonlyArray<ScorableNote>): Map<number, number> {
  const features = new Map<number, number>()
  const add = (index: number, value: number) => {
    const next = (features.get(index) ?? 0) + value
    if (next === 0) features.delete(index)
    else features.set(index, next)
  }

  for (const note of notes) {
    const text = normalizeText(note.content ?? "")
    for (const g of charWbNgrams(text)) {
      const { index, sign } = hashBucket(g, N_CHAR)
      add(CHAR_OFFSET + index, sign)
    }
    for (const g of wordNgrams(text.toLowerCase())) {
      const { index, sign } = hashBucket(g, N_WORD)
      add(WORD_OFFSET + index, sign)
    }
  }

  const perNote = notes.map(structural)
  const size = perNote.length || 1
  for (let i = 0; i < 17; i++) {
    let sum = 0
    for (const n of perNote) sum += n.values[i]
    add(STRUCT_OFFSET + i, sum / size)
  }

  const times = notes.map(n => n.created_at)
  const spanHours = notes.length > 1 ? (Math.max(...times) - Math.min(...times)) / 3600 : 0

  const lens = perNote.map(n => n.lenChars)
  const meanLen = lens.reduce((a, b) => a + b, 0) / size
  const std = Math.sqrt(lens.reduce((a, b) => a + (b - meanLen) ** 2, 0) / size)

  const bodies = new Set(perNote.map(n => n.body))
  const firstTokens = new Map<string, number>()
  for (const n of perNote) firstTokens.set(n.firstToken, (firstTokens.get(n.firstToken) ?? 0) + 1)
  const sameFirst = size < 2 ? 0 : Math.max(...firstTokens.values()) / size

  let pairSum = 0
  let pairs = 0
  for (let i = 0; i < perNote.length; i++) {
    for (let j = i + 1; j < perNote.length; j++) {
      pairSum += jaccard(perNote[i].tokens, perNote[j].tokens)
      pairs++
    }
  }

  add(GROUP_OFFSET + 0, notes.length)
  add(GROUP_OFFSET + 1, spanHours)
  add(GROUP_OFFSET + 2, bodies.size)
  add(GROUP_OFFSET + 3, std)
  add(GROUP_OFFSET + 4, sameFirst)
  add(GROUP_OFFSET + 5, pairs === 0 ? 0 : pairSum / pairs)

  return features
}
