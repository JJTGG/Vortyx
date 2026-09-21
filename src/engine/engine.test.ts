import { describe, expect, it } from "vitest"
import type { Event } from "@/events/types"
import { ProactivityEngine } from "@/engine/engine"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type { UserState } from "@/state/types"

const baseState: UserState = {
  userId: "test-user",
  preferences: {
    proactiveEnabled: true,
  },
  recentEvents: [],
}

const unknownEvent: Event = {
  id: "event-1",
  type: "unknown",
  timestamp: "2026-01-01T10:00:00.000Z",
  source: "test",
  data: {},
}

describe("ProactivityEngine", () => {
  it("returns SILENCE when proactive interactions are disabled", async () => {
    const engine = new ProactivityEngine()

    const state: UserState = {
      ...baseState,
      preferences: {
        proactiveEnabled: false,
      },
    }

    const decision = await engine.evaluate(unknownEvent, state)

    expect(decision).toMatchObject({
      action: "SILENCE",
      source: "deterministic",
      eventId: "event-1",
    })
  })

  it("returns SILENCE for duplicate events", async () => {
    const engine = new ProactivityEngine()

    const state: UserState = {
      ...baseState,
      recentEvents: [unknownEvent],
    }

    const decision = await engine.evaluate(unknownEvent, state)

    expect(decision).toMatchObject({
      action: "SILENCE",
      source: "deterministic",
      eventId: "event-1",
    })
  })

  it("handles deterministic events without an intelligence provider", async () => {
    const engine = new ProactivityEngine()

    const event: Event = {
      ...unknownEvent,
      type: "system",
    }

    const decision = await engine.evaluate(event, baseState)

    expect(decision).toMatchObject({
      action: "SILENCE",
      source: "deterministic",
      eventId: "event-1",
    })
  })

  it("returns WAIT when intelligence is required but no provider is available", async () => {
    const engine = new ProactivityEngine()

    const decision = await engine.evaluate(unknownEvent, baseState)

    expect(decision).toMatchObject({
      action: "WAIT",
      source: "deterministic",
      eventId: "event-1",
    })
  })

  it("preserves a valid WAIT recommendation from an intelligence provider", async () => {
    const provider: IntelligenceProvider = {
      async evaluate() {
        return {
          action: "WAIT",
          reason: "Need more context before initiating",
          evidence: ["Only one relevant signal exists"],
          reconsiderWhen: {
            type: "event",
            eventType: "user_action",
          },
          expiresAt: "2026-01-01T12:00:00.000Z",
        }
      },
    }

    const engine = new ProactivityEngine(provider)

    const decision = await engine.evaluate(unknownEvent, baseState)

    expect(decision).toMatchObject({
      action: "WAIT",
      source: "llm",
      eventId: "event-1",
      reason: "Need more context before initiating",
      recommendation: {
        action: "WAIT",
        reconsiderWhen: {
          type: "event",
          eventType: "user_action",
        },
        expiresAt: "2026-01-01T12:00:00.000Z",
      },
    })
  })

  it("silences when the intelligence provider returns an invalid recommendation", async () => {
    const provider: IntelligenceProvider = {
      async evaluate() {
        return {
          action: "WAIT",
          reason: "Need more context",
          evidence: [],
        } as never
      },
    }

    const engine = new ProactivityEngine(provider)

    const decision = await engine.evaluate(unknownEvent, baseState)

    expect(decision).toMatchObject({
      action: "SILENCE",
      source: "deterministic",
      eventId: "event-1",
      reason: "Intelligence provider returned an invalid recommendation",
    })

    expect(decision.recommendation).toBeUndefined()
  })

  it("does not call the provider when a deterministic rule already resolves the event", async () => {
    let providerCalled = false

    const provider: IntelligenceProvider = {
      async evaluate() {
        providerCalled = true

        return {
          action: "SPEAK",
          reason: "The provider wants to speak",
          evidence: ["Provider evidence"],
        }
      },
    }

    const engine = new ProactivityEngine(provider)

    const event: Event = {
      ...unknownEvent,
      type: "system",
    }

    const decision = await engine.evaluate(event, baseState)

    expect(decision.action).toBe("SILENCE")
    expect(providerCalled).toBe(false)
  })
})