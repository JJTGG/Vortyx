import { describe, expect, it } from "vitest"
import type { Recommendation } from "@/engine/types"
import type { Event } from "@/events/types"
import { InMemoryWaitQueue } from "@/wait/in-memory"

const expiredWait: Recommendation = {
  action: "WAIT",
  reason: "Expired wait",
  evidence: ["The wait lifetime has ended"],
  reconsiderWhen: {
    type: "time",
    at: "2026-01-01T10:05:00.000Z",
  },
  expiresAt: "2026-01-01T10:10:00.000Z",
}

const activeWait: Recommendation = {
  action: "WAIT",
  reason: "Active wait",
  evidence: ["The wait is still within its lifetime"],
  reconsiderWhen: {
    type: "time",
    at: "2026-01-01T10:30:00.000Z",
  },
  expiresAt: "2026-01-01T11:00:00.000Z",
}

const expiredEvent: Event = {
  id: "expired-event",
  type: "user_signal",
  timestamp: "2026-01-01T10:00:00.000Z",
  source: "test",
  data: {
    wait: "expired",
  },
}

const activeEvent: Event = {
  id: "active-event",
  type: "user_signal",
  timestamp: "2026-01-01T10:20:00.000Z",
  source: "test",
  data: {
    wait: "active",
  },
}

describe("InMemoryWaitQueue", () => {
  it("returns expired and active WAITs independently", () => {
    const queue = new InMemoryWaitQueue()

    queue.enqueue({
      event: expiredEvent,
      recommendation: expiredWait,
      queuedAt: "2026-01-01T10:00:00.000Z",
    })

    queue.enqueue({
      event: activeEvent,
      recommendation: activeWait,
      queuedAt: "2026-01-01T10:20:00.000Z",
    })

    const due = queue.getDue({
      now: "2026-01-01T10:20:00.000Z",
    })

    expect(due).toHaveLength(1)
    expect(due[0].event.id).toBe("expired-event")
    expect(due[0].recommendation).toEqual(expiredWait)
  })

  it("does not treat an active WAIT as expired before its own expiry", () => {
    const queue = new InMemoryWaitQueue()

    queue.enqueue({
      event: activeEvent,
      recommendation: activeWait,
      queuedAt: "2026-01-01T10:20:00.000Z",
    })

    const due = queue.getDue({
      now: "2026-01-01T10:25:00.000Z",
    })

    expect(due).toHaveLength(0)
  })

  it("returns an active WAIT when its reconsideration time is reached", () => {
    const queue = new InMemoryWaitQueue()

    queue.enqueue({
      event: activeEvent,
      recommendation: activeWait,
      queuedAt: "2026-01-01T10:20:00.000Z",
    })

    const due = queue.getDue({
      now: "2026-01-01T10:30:00.000Z",
    })

    expect(due).toHaveLength(1)
    expect(due[0].event.id).toBe("active-event")
    expect(due[0].recommendation).toEqual(activeWait)
  })

  it("returns both expired and active WAITs when both are independently due", () => {
    const queue = new InMemoryWaitQueue()

    queue.enqueue({
      event: expiredEvent,
      recommendation: expiredWait,
      queuedAt: "2026-01-01T10:00:00.000Z",
    })

    queue.enqueue({
      event: activeEvent,
      recommendation: activeWait,
      queuedAt: "2026-01-01T10:20:00.000Z",
    })

    const due = queue.getDue({
      now: "2026-01-01T10:30:00.000Z",
    })

    expect(due).toHaveLength(2)

    expect(
      due.map((entry) => entry.event.id),
    ).toEqual([
      "expired-event",
      "active-event",
    ])
  })
})