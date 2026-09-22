import { describe, expect, it } from "vitest"
import type { Event } from "@/events/types"
import { ProactivityEngine } from "@/engine/engine"
import { FakeIntelligenceProvider } from "@/intelligence/fake"
import { InMemoryInteractionDelivery } from "@/interaction/in-memory-delivery"
import { InMemoryDecisionLog } from "@/decision-log/in-memory"
import { processEvent } from "@/application/process-event"
import type { Recommendation } from "@/engine/types"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type { UserState } from "@/state/types"

const state: UserState = {
  userId: "user-1",
  preferences: {
    proactiveEnabled: true,
  },
  recentEvents: [],
}

const event: Event = {
  id: "event-1",
  type: "external",
  timestamp: "2026-01-01T12:00:00.000Z",
  source: "test",
  data: {},
}

describe("processEvent lifecycle", () => {
  it("tracks an initiated interaction", async () => {
    const engine = new ProactivityEngine(
      new FakeIntelligenceProvider(),
    )
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.lifecycle).toBe("INITIATED")
    expect(result.interaction).not.toBeNull()
  })

  it("tracks a deterministic silence", async () => {
    const disabledState: UserState = {
      ...state,
      preferences: {
        proactiveEnabled: false,
      },
    }

    const engine = new ProactivityEngine(
      new FakeIntelligenceProvider(),
    )
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      disabledState,
      engine,
      delivery,
    )

    expect(result.lifecycle).toBe("SILENCED")
    expect(result.interaction).toBeNull()
  })

  it("tracks a queued WAIT", async () => {
    const waitProvider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        return {
          action: "WAIT",
          reason: "More evidence is needed",
          evidence: ["Test evidence"],
          reconsiderWhen: {
            type: "time",
            at: "2026-01-01T12:05:00.000Z",
          },
          expiresAt: "2026-01-01T13:00:00.000Z",
        }
      },
    }

    const engine = new ProactivityEngine(waitProvider)
    const delivery = new InMemoryInteractionDelivery()
    const decisionLog = new InMemoryDecisionLog()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
      decisionLog,
    )

    expect(result.lifecycle).toBe("QUEUED")
    expect(result.interaction).toBeNull()
    expect(result.decision.action).toBe("WAIT")
    expect(result.decision.source).toBe("llm")
    expect(result.decision.reason).toBe(
      "More evidence is needed",
    )
    expect(decisionLog.getEntries()).toEqual([
      {
        eventId: "event-1",
        action: "WAIT",
        source: "llm",
        reason: "More evidence is needed",
        recommendation: {
          action: "WAIT",
          reason: "More evidence is needed",
          evidence: ["Test evidence"],
          reconsiderWhen: {
            type: "time",
            at: "2026-01-01T12:05:00.000Z",
          },
          expiresAt: "2026-01-01T13:00:00.000Z",
        },
        recordedAt: expect.any(String),
      },
    ])
  })
})