import { describe, expect, test } from "bun:test"

import { bucketByHour, thinMarks } from "../src/Components/Feed/timeRailMarks"

const now = 100_000

describe("time rail", () => {
  test("notes are grouped by how many hours ago they were posted", () => {
    const marks = bucketByHour(
      [
        { created: now - 60, offset: 0 },
        { created: now - 120, offset: 10 },
        { created: now - 3700, offset: 50 },
      ],
      now,
    )
    expect(marks).toEqual([
      { label: 0, offset: 0, count: 2 },
      { label: 1, offset: 50, count: 1 },
    ])
  })

  test("each mark sits at the first note of its hour", () => {
    const marks = bucketByHour(
      [
        { created: now - 3700, offset: 80 },
        { created: now - 3650, offset: 60 },
      ],
      now,
    )
    expect(marks[0].offset).toBe(60)
  })

  test("marks too close together merge so labels never overlap", () => {
    const out = thinMarks(
      [
        { label: 0, offset: 0, count: 1 },
        { label: 1, offset: 10, count: 2 },
        { label: 2, offset: 40, count: 1 },
      ],
      500,
    )
    expect(out).toEqual([
      { label: 0, offset: 0, count: 3 },
      { label: 2, offset: 40, count: 1 },
    ])
  })
})
