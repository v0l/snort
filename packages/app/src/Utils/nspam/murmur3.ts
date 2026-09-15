const encoder = new TextEncoder()

/** MurmurHash3 x86 32-bit, signed result, matching sklearn's murmurhash3_bytes_s32 */
export function murmur3_32(key: Uint8Array, seed = 0): number {
  const c1 = 0xcc9e2d51
  const c2 = 0x1b873593
  let h1 = seed | 0
  const len = key.length
  const nblocks = len >> 2
  for (let i = 0; i < nblocks; i++) {
    const idx = i * 4
    let k1 = (key[idx] | (key[idx + 1] << 8) | (key[idx + 2] << 16) | (key[idx + 3] << 24)) | 0
    k1 = Math.imul(k1, c1)
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = Math.imul(k1, c2)
    h1 ^= k1
    h1 = (h1 << 13) | (h1 >>> 19)
    h1 = (Math.imul(h1, 5) + 0xe6546b64) | 0
  }
  const rem = len & 3
  if (rem > 0) {
    const tail = nblocks * 4
    let k1 = 0
    if (rem === 3) k1 ^= key[tail + 2] << 16
    if (rem >= 2) k1 ^= key[tail + 1] << 8
    k1 ^= key[tail]
    k1 = Math.imul(k1, c1)
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = Math.imul(k1, c2)
    h1 ^= k1
  }
  h1 ^= len
  h1 ^= h1 >>> 16
  h1 = Math.imul(h1, 0x85ebca6b)
  h1 ^= h1 >>> 13
  h1 = Math.imul(h1, 0xc2b2ae35)
  h1 ^= h1 >>> 16
  return h1 | 0
}

/** sklearn FeatureHasher bucket: index = |h| % n, sign from h */
export function hashBucket(token: string, nFeatures: number): { index: number; sign: 1 | -1 } {
  const h = murmur3_32(encoder.encode(token), 0)
  return { index: Math.abs(h) % nFeatures, sign: h >= 0 ? 1 : -1 }
}
