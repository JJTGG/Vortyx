import { describe, expect, it } from "vitest"
import { ProactivityEngine } from "@/engine/engine"
import { FakeIntelligenceProvider } from "@/intelligence/fake"
import { InMemoryInteractionDelivery } from "@/interaction/in-memory-delivery"
import { InMemoryDecisionLog } from "@/decision-log/in-memory"
import { processEvent } from "@/application/process-event"
import type { Event } from "@/events/types"
import type { UserState } from "@/state/types"

const event: Event = {
  id: "event-1",
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

describe("processEvent decision logging", () => {
  it("logs an LLM SPEAK decision", async () => {
    const engine = new ProactivityEngine(
      new FakeIntelligenceProvider(),
    )
    const delivery = new InMemoryInteractionDelivery()
    const decisionLog = new InMemoryDecisionLog()

    await processEvent(
      event,
      state,
      engine,
      delivery,
      decisionLog,
    )

    const entries = decisionLog.getEntries()

    expect(entries).toHaveLength(1)
    expect(entries[0].eventId).toBe("event-1")
    expect(entries[0].action).toBe("SPEAK")
    expect(entries[0].source).toBe("llm")
    expect(entries[0].reason).toBe(
      "Fake provider recommends an interaction",
    )
    expect(entries[0].recommendation?.action).toBe("SPEAK")
    expect(Date.parse(entries[0].recordedAt)).not.toBeNaN()
  })

  it("logs a deterministic SILENCE decision", async () => {
    const engine = new ProactivityEngine()
    const delivery = new InMemoryInteractionDelivery()
    const decisionLog = new InMemoryDecisionLog()

    const disabledState: UserState = {
      ...state,
      preferences: {
        proactiveEnabled: false,
      },
    }

    await processEvent(
      event,
      disabledState,
      engine,
      delivery,
      decisionLog,
    )

    const entries = decisionLog.getEntries()

    expect(entries).toHaveLength(1)
    expect(entries[0].eventId).toBe("event-1")
    expect(entries[0].action).toBe("SILENCE")
    expect(entries[0].source).toBe("deterministic")
    expect(entries[0].reason).toBe(
      "Proactive interactions are disabled",
    )
    expect(entries[0].recommendation).toBeUndefined()
  })

  it("logs a deterministic WAIT decision", async () => {
    const engine = new ProactivityEngine()
    const delivery = new InMemoryInteractionDelivery()
    const decisionLog = new InMemoryDecisionLog()

    await processEvent(
      event,
      state,
      engine,
      delivery,
      decisionLog,
    )

    const entries = decisionLog.getEntries()

    expect(entries).toHaveLength(1)
    expect(entries[0].eventId).toBe("event-1")
    expect(entries[0].action).toBe("WAIT")
    expect(entries[0].source).toBe("deterministic")
    expect(entries[0].reason).toBe(
      "Intelligence is required but no provider is available",
    )
    expect(entries[0].recommendation?.action).toBe("WAIT")
  })

  it("does not let logging affect interaction delivery", async () => {
    const engine = new ProactivityEngine(
      new FakeIntelligenceProvider(),
    )
    const delivery = new InMemoryInteractionDelivery()
    const decisionLog = new InMemoryDecisionLog()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
      decisionLog,
    )

    expect(result.interaction).not.toBeNull()
    expect(delivery.getDelivered()).toHaveLength(1)
    expect(decisionLog.getEntries()).toHaveLength(1)
  })
})