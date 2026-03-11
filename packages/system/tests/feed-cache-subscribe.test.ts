/**
 * Tests for FeedCache.subscribe() — the O(1) per-key notification mechanism.
 *
 * The subscribe() API replaces the broad "change" event + keys.includes() linear
 * scan that was used in useUserProfile. Each subscriber is only invoked when
 * its specific key changes, not on every cache mutation.
 */

import { describe, expect, test } from 'bun:test'
import type { CacheStore } from '@snort/shared'
import { FeedCache } from '@snort/shared'

// ---------------------------------------------------------------------------
// Minimal FeedCache implementation for testing
// ---------------------------------------------------------------------------

type TestItem = { id: string; value: string; created: number; loaded: number }

class TestFeedCache extends FeedCache<TestItem> {
  constructor() {
    super('TestFeedCache')
  }

  key(of: TestItem) {
    return of.id
  }

  takeSnapshot() {
    return this.snapshot()
  }

  async search() {
    return []
  }
}

function item(id: string, value = 'v1', created = 1, loaded = Date.now()): TestItem {
  return { id, value, created, loaded }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FeedCache.subscribe()', () => {
  test('callback fires when the subscribed key is set', async () => {
    const cache = new TestFeedCache()
    let callCount = 0

    cache.subscribe('key-a', () => {
      callCount++
    })
    await cache.set(item('key-a'))

    expect(callCount).toBe(1)
  })

  test('callback does NOT fire for a different key', async () => {
    const cache = new TestFeedCache()
    let callCount = 0

    cache.subscribe('key-a', () => {
      callCount++
    })
    await cache.set(item('key-b')) // different key

    expect(callCount).toBe(0)
  })

  test('multiple subscribers on the same key all receive the notification', async () => {
    const cache = new TestFeedCache()
    let count1 = 0
    let count2 = 0
    let count3 = 0

    cache.subscribe('shared-key', () => {
      count1++
    })
    cache.subscribe('shared-key', () => {
      count2++
    })
    cache.subscribe('shared-key', () => {
      count3++
    })

    await cache.set(item('shared-key'))

    expect(count1).toBe(1)
    expect(count2).toBe(1)
    expect(count3).toBe(1)
  })

  test('unsubscribe stops further notifications', async () => {
    const cache = new TestFeedCache()
    let callCount = 0

    const unsub = cache.subscribe('key-a', () => {
      callCount++
    })

    await cache.set(item('key-a')) // fires once
    unsub()
    await cache.set(item('key-a', 'v2')) // should NOT fire

    expect(callCount).toBe(1)
  })

  test('unsubscribing one of two subscribers leaves the other active', async () => {
    const cache = new TestFeedCache()
    let count1 = 0
    let count2 = 0

    const unsub1 = cache.subscribe('key-a', () => {
      count1++
    })
    cache.subscribe('key-a', () => {
      count2++
    })

    await cache.set(item('key-a')) // both fire
    unsub1()
    await cache.set(item('key-a', 'v2')) // only count2 fires

    expect(count1).toBe(1)
    expect(count2).toBe(2)
  })

  test('bulkSet notifies each key individually', async () => {
    const cache = new TestFeedCache()
    let countA = 0
    let countB = 0
    const countC = 0 // not subscribed

    cache.subscribe('a', () => {
      countA++
    })
    cache.subscribe('b', () => {
      countB++
    })

    await cache.bulkSet([item('a'), item('b'), item('c')])

    expect(countA).toBe(1)
    expect(countB).toBe(1)
    expect(countC).toBe(0) // no subscriber, no call
  })

  test('subscriber is not called after unsubscribe even after bulkSet', async () => {
    const cache = new TestFeedCache()
    let callCount = 0

    const unsub = cache.subscribe('a', () => {
      callCount++
    })
    unsub()
    await cache.bulkSet([item('a'), item('b')])

    expect(callCount).toBe(0)
  })

  test('the broad "change" event still fires for backward compatibility', async () => {
    const cache = new TestFeedCache()
    const changedKeys: string[] = []

    cache.on('change', keys => changedKeys.push(...keys))
    await cache.set(item('key-x'))

    expect(changedKeys).toContain('key-x')
  })

  test('subscribe and broad change event both fire on the same set()', async () => {
    const cache = new TestFeedCache()
    let subscribeCount = 0
    const broadKeys: string[] = []

    cache.subscribe('k', () => {
      subscribeCount++
    })
    cache.on('change', keys => broadKeys.push(...keys))

    await cache.set(item('k'))

    expect(subscribeCount).toBe(1)
    expect(broadKeys).toContain('k')
  })

  test('update() with newer data notifies subscriber', async () => {
    const cache = new TestFeedCache()
    let callCount = 0

    cache.subscribe('up', () => {
      callCount++
    })
    await cache.update(item('up', 'v1', 1, 100)) // new entry
    await cache.update(item('up', 'v2', 2, 200)) // updated — newer created

    expect(callCount).toBe(2)
  })

  test('update() with older data does NOT notify subscriber', async () => {
    const cache = new TestFeedCache()
    let callCount = 0

    cache.subscribe('up', () => {
      callCount++
    })
    await cache.update(item('up', 'v2', 2, 200)) // newest
    await cache.update(item('up', 'v1', 1, 100)) // older — should be skipped

    expect(callCount).toBe(1)
  })
})
