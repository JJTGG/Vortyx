import { describe, expect, it } from "vitest"
import type { Event } from "@/events/types"
import { ProactivityEngine } from "@/engine/engine"
import type { Recommendation } from "@/engine/types"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type {
  WaitQueue,
  WaitQueueEntry,
  WaitQueueTrigger,
} from "@/wait/types"
import { InMemoryWaitQueue } from "@/wait/in-memory"
import { InMemoryInteractionDelivery } from "@/interaction/in-memory-delivery"
import { InMemoryInteractionHistory } from "@/interaction/in-memory-history"
import { processWaitQueue } from "@/application/process-wait-queue"
import type { UserState } from "@/state/types"

const event: Event = {
  id: "event-1",
  type: "unknown",
  timestamp: "2026-09-22T04:00:00.000Z",
  source: "test",
  data: {
    value: "example",
  },
}

const state: UserState = {
  userId: "user-1",
  preferences: {
    proactiveEnabled: true,
  },
  recentEvents: [],
}

const wait: Recommendation = {
  action: "WAIT",
  reason: "Need more time",
  evidence: ["Timing is uncertain"],
  reconsiderWhen: {
    type: "time",
    at: "2026-09-22T04:05:00.000Z",
  },
  expiresAt: "2026-09-22T05:00:00.000Z",
}

function enqueueWait(
  queue: WaitQueue,
  recommendation: Recommendation = wait,
): void {
  queue.enqueue({
    event,
    recommendation,
    queuedAt: "2026-09-22T04:00:00.000Z",
  })
}

describe("process wait queue", () => {
  it("processes a due WAIT into SPEAK, delivers the interaction, and removes the entry", async () => {
    const recommendation: Recommendation = {
      action: "SPEAK",
      reason: "Now is the right time",
      evidence: ["Reconsideration time reached"],
      message: "It is time to check in.",
    }

    const provider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        return recommendation
      },
    }

    const engine = new ProactivityEngine(provider)
    const queue = new InMemoryWaitQueue()
    const delivery = new InMemoryInteractionDelivery()
    const history = new InMemoryInteractionHistory()

    enqueueWait(queue)

    const result = await processWaitQueue(
      "2026-09-22T04:05:00.000Z",
      state,
      engine,
      queue,
      delivery,
      undefined,
      history,
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      eventId: "event-1",
      decision: {
        action: "SPEAK",
        reason: "Now is the right time",
        eventId: "event-1",
        source: "llm",
        recommendation,
      },
      interaction: {
        eventId: "event-1",
        message: "It is time to check in.",
        reason: "Now is the right time",
      },
      lifecycle: "INITIATED",
    })

    expect(queue.getAll()).toEqual([])
    expect(delivery.getDelivered()).toEqual([
      result[0].interaction,
    ])
    expect(history.getRecent(1)).toEqual([
      {
        eventId: "event-1",
        message: "It is time to check in.",
        reason: "Now is the right time",
        initiatedAt: "2026-09-22T04:05:00.000Z",
      },
    ])
  })

  it("processes an expired WAIT into SILENCE and removes the entry", async () => {
    const engine = new ProactivityEngine()
    const queue = new InMemoryWaitQueue()
    const delivery = new InMemoryInteractionDelivery()

    enqueueWait(queue)

    const result = await processWaitQueue(
      "2026-09-22T05:00:00.000Z",
      state,
      engine,
      queue,
      delivery,
    )

    expect(result).toHaveLength(1)
    expect(result[0].decision.action).toBe("SILENCE")
    expect(result[0].decision.reason).toBe(
      "WAIT has expired",
    )
    expect(result[0].lifecycle).toBe("SILENCED")
    expect(result[0].interaction).toBeNull()

    expect(queue.getAll()).toEqual([])
    expect(delivery.getDelivered()).toEqual([])
  })

  it("keeps a WAIT queued when its reconsideration condition has not been met", async () => {
    const eventWait: Recommendation = {
      action: "WAIT",
      reason: "Waiting for a user action",
      evidence: ["User action has not happened"],
      reconsiderWhen: {
        type: "event",
        eventType: "user_action",
      },
      expiresAt: "2026-09-22T05:00:00.000Z",
    }

    const queue: WaitQueue = {
      entries: [],
      enqueue(entry: WaitQueueEntry): void {
        this.entries.push(entry)
      },
      getDue(_trigger: WaitQueueTrigger): WaitQueueEntry[] {
        return [...this.entries]
      },
      remove(eventId: string): void {
        const index = this.entries.findIndex(
          (entry) => entry.event.id === eventId,
        )

        if (index !== -1) {
          this.entries.splice(index, 1)
        }
      },
      getAll(): WaitQueueEntry[] {
        return [...this.entries]
      },
    }

    enqueueWait(queue, eventWait)

    const engine = new ProactivityEngine()
    const delivery = new InMemoryInteractionDelivery()

    const result = await processWaitQueue(
      "2026-09-22T04:30:00.000Z",
      state,
      engine,
      queue,
      delivery,
    )

    expect(result).toHaveLength(1)
    expect(result[0].decision.action).toBe("WAIT")
    expect(result[0].decision.reason).toBe(
      "WAIT reconsideration condition has not been met",
    )
    expect(result[0].lifecycle).toBe("QUEUED")
    expect(result[0].interaction).toBeNull()

    expect(queue.getAll()).toHaveLength(1)
    expect(queue.getAll()[0].event.id).toBe("event-1")
    expect(delivery.getDelivered()).toEqual([])
  })

  it("reconsiders a WAIT when a matching trigger event arrives", async () => {
    const eventWait: Recommendation = {
      action: "WAIT",
      reason: "Waiting for a user action",
      evidence: ["User action has not happened"],
      reconsiderWhen: {
        type: "event",
        eventType: "user_signal",
      },
      expiresAt: "2026-09-22T05:00:00.000Z",
    }

    const recommendation: Recommendation = {
      action: "SPEAK",
      reason: "The user action arrived",
      evidence: ["Matching user_signal event received"],
      message: "I noticed the action.",
    }

    const provider: IntelligenceProvider = {
      async evaluate(
        receivedEvent: Event,
      ): Promise<Recommendation> {
        expect(receivedEvent.type).toBe("user_signal")
        return recommendation
      },
    }

    const queue = new InMemoryWaitQueue()
    const delivery = new InMemoryInteractionDelivery()
    const engine = new ProactivityEngine(provider)

    enqueueWait(queue, eventWait)

    const triggerEvent: Event = {
      id: "event-2",
      type: "user_signal",
      timestamp: "2026-09-22T04:30:00.000Z",
      source: "test",
      data: {
        action: "completed",
      },
    }

    const result = await processWaitQueue(
      "2026-09-22T04:30:00.000Z",
      state,
      engine,
      queue,
      delivery,
      undefined,
      undefined,
      triggerEvent,
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      eventId: "event-1",
      decision: {
        action: "SPEAK",
        reason: "The user action arrived",
        eventId: "event-1",
        source: "llm",
        recommendation,
      },
      interaction: {
        eventId: "event-1",
        message: "I noticed the action.",
        reason: "The user action arrived",
      },
      lifecycle: "INITIATED",
    })

    expect(queue.getAll()).toEqual([])
    expect(delivery.getDelivered()).toEqual([
      result[0].interaction,
    ])
  })

  it("reconsiders only the WAIT matched by the trigger event", async () => {
    const firstEvent: Event = {
      id: "event-1",
      type: "unknown",
      timestamp: "2026-09-22T04:00:00.000Z",
      source: "test",
      data: {
        value: "first",
      },
    }

    const secondEvent: Event = {
      id: "event-2",
      type: "unknown",
      timestamp: "2026-09-22T04:01:00.000Z",
      source: "test",
      data: {
        value: "second",
      },
    }

    const firstWait: Recommendation = {
      action: "WAIT",
      reason: "Waiting for signal A",
      evidence: ["Signal A has not happened"],
      reconsiderWhen: {
        type: "event",
        eventType: "signal_a",
      },
      expiresAt: "2026-09-22T05:00:00.000Z",
    }

    const secondWait: Recommendation = {
      action: "WAIT",
      reason: "Waiting for signal B",
      evidence: ["Signal B has not happened"],
      reconsiderWhen: {
        type: "event",
        eventType: "signal_b",
      },
      expiresAt: "2026-09-22T05:00:00.000Z",
    }

    const recommendation: Recommendation = {
      action: "SPEAK",
      reason: "Signal A arrived",
      evidence: ["Matching signal_a event received"],
      message: "Signal A arrived.",
    }

    const provider: IntelligenceProvider = {
      async evaluate(
        receivedEvent: Event,
      ): Promise<Recommendation> {
        expect(receivedEvent.type).toBe("signal_a")
        return recommendation
      },
    }

    const engine = new ProactivityEngine(provider)
    const queue = new InMemoryWaitQueue()
    const delivery = new InMemoryInteractionDelivery()

    queue.enqueue({
      event: firstEvent,
      recommendation: firstWait,
      queuedAt: "2026-09-22T04:00:00.000Z",
    })

    queue.enqueue({
      event: secondEvent,
      recommendation: secondWait,
      queuedAt: "2026-09-22T04:01:00.000Z",
    })

    const triggerEvent: Event = {
      id: "trigger-1",
      type: "signal_a",
      timestamp: "2026-09-22T04:30:00.000Z",
      source: "test",
      data: {
        completed: true,
      },
    }

    const result = await processWaitQueue(
      "2026-09-22T04:30:00.000Z",
      state,
      engine,
      queue,
      delivery,
      undefined,
      undefined,
      triggerEvent,
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      eventId: "event-1",
      decision: {
        action: "SPEAK",
        reason: "Signal A arrived",
        eventId: "event-1",
        source: "llm",
        recommendation,
      },
      interaction: {
        eventId: "event-1",
        message: "Signal A arrived.",
        reason: "Signal A arrived",
      },
      lifecycle: "INITIATED",
    })

    expect(queue.getAll()).toHaveLength(1)
    expect(queue.getAll()[0]).toEqual({
      event: secondEvent,
      recommendation: secondWait,
      queuedAt: "2026-09-22T04:01:00.000Z",
    })

    expect(delivery.getDelivered()).toEqual([
      result[0].interaction,
    ])
  })

  it("replaces a due WAIT with a new WAIT recommendation", async () => {
    const newWait: Recommendation = {
      action: "WAIT",
      reason: "Need another five minutes",
      evidence: ["More time is still needed"],
      reconsiderWhen: {
        type: "time",
        at: "2026-09-22T04:10:00.000Z",
      },
      expiresAt: "2026-09-22T05:00:00.000Z",
    }

    const provider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        return newWait
      },
    }

    const engine = new ProactivityEngine(provider)
    const queue = new InMemoryWaitQueue()
    const delivery = new InMemoryInteractionDelivery()

    enqueueWait(queue)

    const result = await processWaitQueue(
      "2026-09-22T04:05:00.000Z",
      state,
      engine,
      queue,
      delivery,
    )

    expect(result).toHaveLength(1)
    expect(result[0].decision.action).toBe("WAIT")
    expect(result[0].lifecycle).toBe("QUEUED")
    expect(result[0].interaction).toBeNull()

    expect(queue.getAll()).toHaveLength(1)
    expect(queue.getAll()[0].recommendation).toEqual(
      newWait,
    )
    expect(queue.getAll()[0].queuedAt).toBe(
      "2026-09-22T04:05:00.000Z",
    )
  })

  it("does nothing when the queue has no due entries", async () => {
    const engine = new ProactivityEngine()
    const queue = new InMemoryWaitQueue()
    const delivery = new InMemoryInteractionDelivery()

    const result = await processWaitQueue(
      "2026-09-22T04:05:00.000Z",
      state,
      engine,
      queue,
      delivery,
    )

    expect(result).toEqual([])
    expect(delivery.getDelivered()).toEqual([])
  })
})