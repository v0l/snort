#!/usr/bin/env bun
/**
 * Convert the nspam LightGBM text model into the compact binary the app loads at runtime.
 *
 *   bun packages/app/scripts/nspam-convert.ts [version]
 *
 * Downloads model.txt + calibration.npz from huggingface.co/barrydeen/nspam and writes
 * packages/app/public/nspam-<version>.bin (~700kB vs 9MB for model.txt).
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { inflateRawSync } from "node:zlib"

const VERSION = process.argv[2] ?? "v2.4"
const BASE = `https://huggingface.co/barrydeen/nspam/resolve/main/${VERSION}`
const OUT = join(dirname(new URL(import.meta.url).pathname), "..", "src", "assets", `nspam-${VERSION}.bin`)

interface Tree {
  feature: number[]
  threshold: number[]
  left: number[]
  right: number[]
  leafValue: number[]
}

function parseTrees(model: string): Tree[] {
  const trees: Tree[] = []
  for (const block of model.split("\nTree=").slice(1)) {
    const fields = new Map<string, string>()
    for (const line of block.split("\n")) {
      const eq = line.indexOf("=")
      if (eq === -1) continue
      fields.set(line.slice(0, eq), line.slice(eq + 1))
    }
    const nums = (k: string) => (fields.get(k) ?? "").split(" ").filter(Boolean).map(Number)
    const feature = nums("split_feature")
    if (feature.length === 0) continue
    if (nums("num_cat")[0]) throw new Error("categorical splits are not supported")
    trees.push({
      feature,
      threshold: nums("threshold"),
      left: nums("left_child"),
      right: nums("right_child"),
      leafValue: nums("leaf_value"),
    })
  }
  return trees
}

async function loadCalibration(): Promise<{ x: number[]; y: number[] }> {
  // minimal .npz reader: zip of two uncompressed .npy float32 arrays
  const buf = new Uint8Array(await (await fetch(`${BASE}/calibration.npz`)).arrayBuffer())
  const view = new DataView(buf.buffer)
  const files = new Map<string, Float32Array>()
  for (let i = 0; i < buf.length - 4; i++) {
    if (view.getUint32(i, true) !== 0x04034b50) continue
    const method = view.getUint16(i + 8, true)
    const compressedSize = view.getUint32(i + 18, true)
    const nameLen = view.getUint16(i + 26, true)
    const extraLen = view.getUint16(i + 28, true)
    const name = new TextDecoder().decode(buf.subarray(i + 30, i + 30 + nameLen))
    const start = i + 30 + nameLen + extraLen
    if (method !== 0 && method !== 8) throw new Error(`unsupported npz compression in ${name}`)
    const stored = buf.subarray(start, start + compressedSize)
    const npy = method === 8 ? new Uint8Array(inflateRawSync(stored)) : stored
    const headerLen = new DataView(npy.buffer, npy.byteOffset).getUint16(8, true)
    const header = new TextDecoder().decode(npy.subarray(10, 10 + headerLen))
    if (!header.includes("'<f4'")) throw new Error(`unexpected npy dtype in ${name}: ${header}`)
    const data = npy.subarray(10 + headerLen)
    files.set(name, new Float32Array(data.slice().buffer))
  }
  const x = files.get("calib_x.npy")
  const y = files.get("calib_y.npy")
  if (!x || !y) throw new Error("calibration.npz missing calib_x/calib_y")
  return { x: [...x], y: [...y] }
}

const [modelText, calib] = await Promise.all([
  fetch(`${BASE}/model.txt`).then(r => r.text()),
  loadCalibration(),
])

const trees = parseTrees(modelText)
const maxFeature = Number(/max_feature_idx=(\d+)/.exec(modelText)?.[1])
const totalNodes = trees.reduce((a, t) => a + t.feature.length, 0)
const totalLeaves = trees.reduce((a, t) => a + t.leafValue.length, 0)

const HEADER = 32
const f64 = totalNodes + totalLeaves + calib.x.length * 2
const i32 = totalNodes * 3 + trees.length * 2
const out = new ArrayBuffer(HEADER + f64 * 8 + i32 * 4)
const head = new DataView(out)
head.setUint32(0, 0x4d50534e, true) // "NSPM"
head.setUint32(4, 2, true) // format version
head.setUint32(8, trees.length, true)
head.setUint32(12, totalNodes, true)
head.setUint32(16, totalLeaves, true)
head.setUint32(20, calib.x.length, true)
head.setUint32(24, maxFeature + 1, true)

const threshold = new Float64Array(out, HEADER, totalNodes)
const leafValue = new Float64Array(out, HEADER + totalNodes * 8, totalLeaves)
const calibX = new Float64Array(out, HEADER + (totalNodes + totalLeaves) * 8, calib.x.length)
const calibY = new Float64Array(out, HEADER + (totalNodes + totalLeaves + calib.x.length) * 8, calib.y.length)
const intBase = HEADER + f64 * 8
const feature = new Int32Array(out, intBase, totalNodes)
const left = new Int32Array(out, intBase + totalNodes * 4, totalNodes)
const right = new Int32Array(out, intBase + totalNodes * 8, totalNodes)
const nodeOffset = new Int32Array(out, intBase + totalNodes * 12, trees.length)
const leafOffset = new Int32Array(out, intBase + totalNodes * 12 + trees.length * 4, trees.length)

let n = 0
let l = 0
trees.forEach((t, i) => {
  nodeOffset[i] = n
  leafOffset[i] = l
  for (let k = 0; k < t.feature.length; k++) {
    feature[n + k] = t.feature[k]
    threshold[n + k] = t.threshold[k]
    left[n + k] = t.left[k]
    right[n + k] = t.right[k]
  }
  leafValue.set(t.leafValue, l)
  n += t.feature.length
  l += t.leafValue.length
})
calibX.set(calib.x)
calibY.set(calib.y)

await mkdir(dirname(OUT), { recursive: true })
await Bun.write(OUT, out)
console.log(`${OUT}: ${trees.length} trees, ${totalNodes} nodes, ${(out.byteLength / 1024) | 0} kB`)
