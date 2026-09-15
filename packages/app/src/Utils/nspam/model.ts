/** Reader + predictor for the binary produced by scripts/nspam-convert.ts */
export class NspamModel {
  readonly nTrees: number
  readonly nFeatures: number
  private readonly threshold: Float64Array
  private readonly leafValue: Float64Array
  private readonly calibX: Float64Array
  private readonly calibY: Float64Array
  private readonly feature: Int32Array
  private readonly left: Int32Array
  private readonly right: Int32Array
  private readonly nodeOffset: Int32Array
  private readonly leafOffset: Int32Array

  constructor(buffer: ArrayBuffer) {
    const head = new DataView(buffer)
    if (head.getUint32(0, true) !== 0x4d50534e) throw new Error("not an nspam model")
    if (head.getUint32(4, true) !== 2) throw new Error("unsupported nspam model format")
    this.nTrees = head.getUint32(8, true)
    const totalNodes = head.getUint32(12, true)
    const totalLeaves = head.getUint32(16, true)
    const nCalib = head.getUint32(20, true)
    this.nFeatures = head.getUint32(24, true)

    const HEADER = 32
    this.threshold = new Float64Array(buffer, HEADER, totalNodes)
    this.leafValue = new Float64Array(buffer, HEADER + totalNodes * 8, totalLeaves)
    this.calibX = new Float64Array(buffer, HEADER + (totalNodes + totalLeaves) * 8, nCalib)
    this.calibY = new Float64Array(buffer, HEADER + (totalNodes + totalLeaves + nCalib) * 8, nCalib)
    const intBase = HEADER + (totalNodes + totalLeaves + nCalib * 2) * 8
    this.feature = new Int32Array(buffer, intBase, totalNodes)
    this.left = new Int32Array(buffer, intBase + totalNodes * 4, totalNodes)
    this.right = new Int32Array(buffer, intBase + totalNodes * 8, totalNodes)
    this.nodeOffset = new Int32Array(buffer, intBase + totalNodes * 12, this.nTrees)
    this.leafOffset = new Int32Array(buffer, intBase + totalNodes * 12 + this.nTrees * 4, this.nTrees)
  }

  /** Sum of tree outputs before the sigmoid link */
  rawMargin(features: ReadonlyMap<number, number>) {
    let sum = 0
    for (let t = 0; t < this.nTrees; t++) {
      const nodes = this.nodeOffset[t]
      const leaves = this.leafOffset[t]
      let node = 0
      for (;;) {
        const i = nodes + node
        const value = features.get(this.feature[i]) ?? 0
        const next = value <= this.threshold[i] ? this.left[i] : this.right[i]
        if (next < 0) {
          sum += this.leafValue[leaves + ~next]
          break
        }
        node = next
      }
    }
    return sum
  }

  /** Model probability, before isotonic calibration */
  rawScore(features: ReadonlyMap<number, number>) {
    return 1 / (1 + Math.exp(-this.rawMargin(features)))
  }

  /** Piecewise-linear interpolation through the isotonic calibration knots */
  calibrate(raw: number) {
    const x = this.calibX
    const y = this.calibY
    if (x.length === 0) return raw
    if (raw <= x[0]) return y[0]
    if (raw >= x[x.length - 1]) return y[y.length - 1]
    let hi = 1
    while (hi < x.length && x[hi] < raw) hi++
    const lo = hi - 1
    const span = x[hi] - x[lo]
    return span === 0 ? y[hi] : y[lo] + ((raw - x[lo]) / span) * (y[hi] - y[lo])
  }

  score(features: ReadonlyMap<number, number>) {
    const raw = this.rawScore(features)
    return { raw, calibrated: this.calibrate(raw) }
  }
}
