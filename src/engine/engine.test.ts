import { describe, expect, it } from "vitest"
import { ProactivityEngine } from "@/engine/engine"
import { FakeIntelligenceProvider } from "@/intelligence/fake"
import type { Event } from "@/events/types"
import type { UserState } from "@/state/types"

const event: Event = {
  id: "event-1",
  type: "unknown_event",
  timestamp: new Date().toISOString(),
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

describe("ProactivityEngine", () => {
  it("uses intelligence when deterministic logic cannot resolve an event", async () => {
    const engine = new ProactivityEngine(
      new FakeIntelligenceProvider(),
    )

    const decision = await engine.evaluate(event, state)

    expect(decision.action).toBe("SPEAK")
    expect(decision.source).toBe("llm")
    expect(decision.recommendation?.action).toBe("SPEAK")
  })

  it("continues without an intelligence provider", async () => {
    const engine = new ProactivityEngine()

    const decision = await engine.evaluate(event, state)

    expect(decision.action).toBe("WAIT")
    expect(decision.source).toBe("deterministic")
  })

  it("silences when proactive interactions are disabled", async () => {
    const engine = new ProactivityEngine(
      new FakeIntelligenceProvider(),
    )

    const disabledState: UserState = {
      ...state,
      preferences: {
        proactiveEnabled: false,
      },
    }

    const decision = await engine.evaluate(event, disabledState)

    expect(decision.action).toBe("SILENCE")
    expect(decision.source).toBe("deterministic")
  })
})