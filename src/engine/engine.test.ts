import { describe, expect, it } from "vitest"
import type { Event } from "@/events/types"
import type { Recommendation } from "@/engine/types"
import { ProactivityEngine } from "@/engine/engine"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type { UserState } from "@/state/types"

const unknownEvent: Event = {
  id: "event-1",
  type: "unknown",
  timestamp: "2026-01-01T10:00:00.000Z",
  source: "test",
  data: {},
}

const deterministicEvent: Event = {
  id: "event-2",
  type: "system",
  timestamp: "2026-01-01T10:00:00.000Z",
  source: "test",
  data: {},
}

const baseState: UserState = {
  userId: "user-1",
  preferences: {
    proactiveEnabled: true,
  },
  recentEvents: [],
}

class FixedProvider implements IntelligenceProvider {
  constructor(
    private readonly recommendation: Recommendation,
  ) {}

  async evaluate(): Promise<Recommendation> {
    return this.recommendation
  }
}

describe("ProactivityEngine", () => {
  it("returns SILENCE when proactive interactions are disabled", async () => {
    const engine = new ProactivityEngine()

    const decision = await engine.evaluate(
      unknownEvent,
      {
        ...baseState,
        preferences: {
          proactiveEnabled: false,
        },
      },
    )

    expect(decision).toEqual({
      action: "SILENCE",
      reason: "Proactive interactions are disabled",
      eventId: "event-1",
      source: "deterministic",
    })
  })

  it("returns SILENCE for duplicate events", async () => {
    const engine = new ProactivityEngine()

    const decision = await engine.evaluate(
      unknownEvent,
      {
        ...baseState,
        recentEvents: [
          {
            ...unknownEvent,
            id: "previous-event",
          },
        ],
      },
    )

    expect(decision).toEqual({
      action: "SILENCE",
      reason: "Duplicate event detected",
      eventId: "event-1",
      source: "deterministic",
    })
  })

  it("handles deterministic events without consulting intelligence", async () => {
    const provider = new FixedProvider({
      action: "SPEAK",
      reason: "Should not be used",
      evidence: ["test"],
      message: "Should not be used",
    })

    const engine = new ProactivityEngine(provider)

    const decision = await engine.evaluate(
      deterministicEvent,
      baseState,
    )

    expect(decision).toEqual({
      action: "SILENCE",
      reason: "System events can be handled deterministically",
      eventId: "event-2",
      source: "deterministic",
    })
  })

  it("uses the rule-based provider when no provider is supplied", async () => {
    const engine = new ProactivityEngine()

    const decision = await engine.evaluate(
      unknownEvent,
      baseState,
    )

    expect(decision).toEqual({
      action: "SILENCE",
      reason: "No relevant feedback is available",
      eventId: "event-1",
      source: "llm",
      recommendation: {
        action: "SILENCE",
        reason: "No relevant feedback is available",
        evidence: [
          "Event type: unknown",
          "Evaluation context contains no feedback",
        ],
      },
    })
  })

  it("preserves a valid WAIT recommendation from an intelligence provider", async () => {
    const recommendation: Recommendation = {
      action: "WAIT",
      reason: "Need more time",
      evidence: ["Timing is uncertain"],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    }

    const engine = new ProactivityEngine(
      new FixedProvider(recommendation),
    )

    const decision = await engine.evaluate(
      unknownEvent,
      baseState,
    )

    expect(decision).toEqual({
      action: "WAIT",
      reason: "Need more time",
      eventId: "event-1",
      source: "llm",
      recommendation,
    })
  })

  it("silences when the intelligence provider returns an invalid recommendation", async () => {
    const provider = {
      async evaluate(): Promise<Recommendation> {
        return {
          action: "SPEAK",
          reason: "",
          evidence: [],
          message: "",
        }
      },
    }

    const engine = new ProactivityEngine(provider)

    const decision = await engine.evaluate(
      unknownEvent,
      baseState,
    )

    expect(decision).toEqual({
      action: "SILENCE",
      reason:
        "Intelligence provider returned an invalid recommendation",
      eventId: "event-1",
      source: "deterministic",
    })
  })

  it("does not call the provider when a deterministic rule already resolves the event", async () => {
    let calls = 0

    const provider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        calls += 1

        return {
          action: "SPEAK",
          reason: "Should not be used",
          evidence: ["test"],
          message: "Should not be used",
        }
      },
    }

    const engine = new ProactivityEngine(provider)

    await engine.evaluate(
      deterministicEvent,
      baseState,
    )

    expect(calls).toBe(0)
  })

  it("returns a bounded WAIT when the intelligence provider fails", async () => {
    const provider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        throw new Error("Provider failed")
      },
    }

    const engine = new ProactivityEngine(provider)

    const decision = await engine.evaluate(
      unknownEvent,
      baseState,
    )

    expect(decision.action).toBe("WAIT")
    expect(decision.source).toBe("deterministic")
    expect(decision.recommendation?.action).toBe("WAIT")
  })

  it("keeps WAITING when the reconsideration condition has not been met", async () => {
    const wait: Recommendation = {
      action: "WAIT",
      reason: "Need more time",
      evidence: [],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    }

    const engine = new ProactivityEngine()

    const decision =
      await engine.evaluateReconsideredWait(
        wait,
        unknownEvent,
        baseState,
        "2026-01-01T10:02:00.000Z",
      )

    expect(decision.action).toBe("WAIT")
    expect(decision.source).toBe("deterministic")
    expect(decision.recommendation).toEqual(wait)
  })

  it("silences an expired WAIT", async () => {
    const wait: Recommendation = {
      action: "WAIT",
      reason: "Need more time",
      evidence: [],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    }

    const engine = new ProactivityEngine()

    const decision =
      await engine.evaluateReconsideredWait(
        wait,
        unknownEvent,
        baseState,
        "2026-01-01T11:00:00.000Z",
      )

    expect(decision.action).toBe("SILENCE")
    expect(decision.source).toBe("deterministic")
  })

  it("re-runs evaluation when a WAIT should be reconsidered", async () => {
    const wait: Recommendation = {
      action: "WAIT",
      reason: "Need more time",
      evidence: [],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    }

    const recommendation: Recommendation = {
      action: "SPEAK",
      reason: "Now is the right time",
      evidence: ["Reconsideration time reached"],
      message: "It is time to check in.",
    }

    const engine = new ProactivityEngine(
      new FixedProvider(recommendation),
    )

    const decision =
      await engine.evaluateReconsideredWait(
        wait,
        unknownEvent,
        baseState,
        "2026-01-01T10:05:00.000Z",
      )

    expect(decision).toEqual({
      action: "SPEAK",
      reason: "Now is the right time",
      eventId: "event-1",
      source: "llm",
      recommendation,
    })
  })

  it("does not call the provider after reconsideration if the new event is deterministic", async () => {
    let calls = 0

    const provider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        calls += 1

        return {
          action: "SPEAK",
          reason: "Should not be used",
          evidence: ["test"],
          message: "Should not be used",
        }
      },
    }

    const wait: Recommendation = {
      action: "WAIT",
      reason: "Waiting for a system event",
      evidence: [],
      reconsiderWhen: {
        type: "event",
        eventType: "system",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    }

    const engine = new ProactivityEngine(provider)

    await engine.evaluateReconsideredWait(
      wait,
      deterministicEvent,
      baseState,
      "2026-01-01T10:05:00.000Z",
    )

    expect(calls).toBe(0)
  })

  it("can create a new bounded WAIT when reconsideration needs intelligence but the provider fails", async () => {
    const provider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        throw new Error("Provider failed")
      },
    }

    const wait: Recommendation = {
      action: "WAIT",
      reason: "Waiting for more evidence",
      evidence: [],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    }

    const engine = new ProactivityEngine(provider)

    const decision =
      await engine.evaluateReconsideredWait(
        wait,
        unknownEvent,
        baseState,
        "2026-01-01T10:05:00.000Z",
      )

    expect(decision.action).toBe("WAIT")
    expect(decision.source).toBe("deterministic")
    expect(decision.recommendation?.action).toBe("WAIT")
  })
})