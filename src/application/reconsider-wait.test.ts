import { describe, expect, it } from "vitest"
import { ProactivityEngine } from "@/engine/engine"
import { FakeIntelligenceProvider } from "@/intelligence/fake"
import { InMemoryInteractionDelivery } from "@/interaction/in-memory-delivery"
import { InMemoryDecisionLog } from "@/decision-log/in-memory"
import { reconsiderWait } from "@/application/reconsider-wait"
import type { Event } from "@/events/types"
import type { Recommendation } from "@/engine/types"
import type { UserState } from "@/state/types"

const event: Event = {
  id: "event-2",
  type: "unknown",
  timestamp: "2026-01-01T10:00:00.000Z",
  source: "test",
  data: {},
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
  reason: "Waiting for more time",
  evidence: ["Test evidence"],
  reconsiderWhen: {
    type: "time",
    at: "2026-01-01T10:05:00.000Z",
  },
  expiresAt: "2026-01-01T11:00:00.000Z",
}

describe("reconsiderWait application boundary", () => {
  it("keeps waiting without invoking intelligence", async () => {
    let evaluations = 0

    const provider = new FakeIntelligenceProvider()

    const engine = new ProactivityEngine({
      async evaluate(event, state) {
        evaluations += 1
        return provider.evaluate(event, state)
      },
    })

    const delivery = new InMemoryInteractionDelivery()
    const decisionLog = new InMemoryDecisionLog()

    const result = await reconsiderWait(
      wait,
      event,
      state,
      engine,
      delivery,
      "2026-01-01T10:03:00.000Z",
      decisionLog,
    )

    expect(result.decision.action).toBe("WAIT")
    expect(result.decision.source).toBe("deterministic")
    expect(evaluations).toBe(0)
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])

    expect(decisionLog.getEntries()).toHaveLength(1)
    expect(decisionLog.getEntries()[0].action).toBe("WAIT")
  })

  it("re-evaluates after the reconsideration condition is met", async () => {
    let evaluations = 0

    const engine = new ProactivityEngine({
      async evaluate(event, state) {
        evaluations += 1
        return new FakeIntelligenceProvider().evaluate(
          event,
          state,
        )
      },
    })

    const delivery = new InMemoryInteractionDelivery()
    const decisionLog = new InMemoryDecisionLog()

    const result = await reconsiderWait(
      wait,
      event,
      state,
      engine,
      delivery,
      "2026-01-01T10:06:00.000Z",
      decisionLog,
    )

    expect(result.decision.action).toBe("SPEAK")
    expect(result.decision.source).toBe("llm")
    expect(evaluations).toBe(1)
    expect(result.interaction).not.toBeNull()
    expect(delivery.getDelivered()).toHaveLength(1)

    expect(decisionLog.getEntries()).toHaveLength(1)
    expect(decisionLog.getEntries()[0].action).toBe("SPEAK")
    expect(decisionLog.getEntries()[0].source).toBe("llm")
  })

  it("silences an expired WAIT without invoking intelligence", async () => {
    let evaluations = 0

    const engine = new ProactivityEngine({
      async evaluate() {
        evaluations += 1

        return {
          action: "SPEAK",
          reason: "Should not be reached",
          evidence: [],
          message: "Should not be delivered",
        }
      },
    })

    const delivery = new InMemoryInteractionDelivery()
    const decisionLog = new InMemoryDecisionLog()

    const result = await reconsiderWait(
      wait,
      event,
      state,
      engine,
      delivery,
      "2026-01-01T11:00:00.000Z",
      decisionLog,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.source).toBe("deterministic")
    expect(evaluations).toBe(0)
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])

    expect(decisionLog.getEntries()).toHaveLength(1)
    expect(decisionLog.getEntries()[0].action).toBe("SILENCE")
  })
})