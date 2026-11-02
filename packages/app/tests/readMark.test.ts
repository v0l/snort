import { describe, expect, test } from "bun:test"

import { advanceMark, countSince, SessionGap, startSession } from "../src/Utils/readMark"

describe("read mark", () => {
  test("first visit records what you read with nothing to come back to", () => {
    expect(advanceMark(undefined, 100, 1000)).toEqual({ readUntil: 100, previous: 0, savedAt: 1000 })
  })

  test("reading only moves the mark forward", () => {
    const m = advanceMark({ readUntil: 500, previous: 0, savedAt: 1000 }, 300, 1010)
    expect(m.readUntil).toBe(500)
  })

  test("coming back after a break makes the last mark the place you left off", () => {
    const left = { readUntil: 500, previous: 200, savedAt: 1000 }
    const back = startSession(left, 1000 + SessionGap + 1)
    expect(back?.previous).toBe(500)
  })

  test("a quick reload keeps the same session", () => {
    const left = { readUntil: 500, previous: 200, savedAt: 1000 }
    expect(startSession(left, 1060)).toEqual(left)
  })

  test("reading after coming back does not move where you left off", () => {
    const back = startSession({ readUntil: 500, previous: 200, savedAt: 1000 }, 5000)
    const later = advanceMark(back, 900, 5010)
    expect(later.previous).toBe(500)
    expect(later.readUntil).toBe(900)
  })

  test("new notes are the ones newer than where you left off", () => {
    expect(countSince([100, 600, 700, 400], 500)).toBe(2)
    expect(countSince([100, 600], 0)).toBe(0)
  })
})
