import { describe, expect, it, vi } from "vitest"
import { processEvent } from "@/application/process-event"
import { ProactivityEngine } from "@/engine/engine"
import type { Event } from "@/events/types"
import { executeInteraction } from "@/interaction/execute"
import { InMemoryInteractionDelivery } from "@/interaction/in-memory-delivery"
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
  type: "unknown_event",
  timestamp: "2026-01-01T10:00:00.000Z",
  source: "test",
  data: {
    value: "relevant",
  },
}

function createProvider(
  recommendation: Recommendation,
): IntelligenceProvider {
  return {
    evaluate: vi.fn().mockResolvedValue(recommendation),
  }
}

describe("processEvent", () => {
  it("runs the full SPEAK path and delivers the interaction", async () => {
    const provider = createProvider({
      action: "SPEAK",
      reason: "The event is relevant",
      evidence: ["Relevant signal"],
      message: "Something needs your attention.",
    })

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SPEAK")
    expect(result.decision.source).toBe("llm")
    expect(result.interaction).toEqual({
      eventId: "event-1",
      message: "Something needs your attention.",
      reason: "The event is relevant",
    })

    expect(delivery.getDelivered()).toEqual([
      {
        eventId: "event-1",
        message: "Something needs your attention.",
        reason: "The event is relevant",
      },
    ])
  })

  it("runs the full WAIT path without delivering an interaction", async () => {
    const provider = createProvider({
      action: "WAIT",
      reason: "More context is needed",
      evidence: ["Insufficient context"],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    })

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("WAIT")
    expect(result.decision.source).toBe("llm")
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("runs the full SILENCE path for deterministic events", async () => {
    const provider = createProvider({
      action: "SPEAK",
      reason: "This should never be reached",
      evidence: [],
      message: "This should never be delivered.",
    })

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const deterministicEvent: Event = {
      ...event,
      type: "system",
    }

    const result = await processEvent(
      deterministicEvent,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.source).toBe("deterministic")
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
    expect(provider.evaluate).not.toHaveBeenCalled()
  })

  it("falls back to bounded WAIT when no provider is available", async () => {
    const engine = new ProactivityEngine()
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("WAIT")
    expect(result.decision.source).toBe("deterministic")
    expect(result.decision.recommendation?.action).toBe("WAIT")
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("falls back to bounded WAIT when the provider fails", async () => {
    const provider: IntelligenceProvider = {
      evaluate: vi.fn().mockRejectedValue(
        new Error("Provider unavailable"),
      ),
    }

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("WAIT")
    expect(result.decision.source).toBe("deterministic")
    expect(result.decision.reason).toBe(
      "Intelligence provider failed",
    )
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("silences the event when proactive interactions are disabled", async () => {
    const provider = createProvider({
      action: "SPEAK",
      reason: "This should never be reached",
      evidence: [],
      message: "This should never be delivered.",
    })

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const disabledState: UserState = {
      ...state,
      preferences: {
        proactiveEnabled: false,
      },
    }

    const result = await processEvent(
      event,
      disabledState,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.source).toBe("deterministic")
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
    expect(provider.evaluate).not.toHaveBeenCalled()
  })

  it("silences duplicate events without consulting intelligence", async () => {
    const provider = createProvider({
      action: "SPEAK",
      reason: "This should never be reached",
      evidence: [],
      message: "This should never be delivered.",
    })

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const duplicateState: UserState = {
      ...state,
      recentEvents: [event],
    }

    const result = await processEvent(
      event,
      duplicateState,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.reason).toBe(
      "Duplicate event detected",
    )
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
    expect(provider.evaluate).not.toHaveBeenCalled()
  })

  it("silences an invalid provider recommendation", async () => {
    const provider: IntelligenceProvider = {
      evaluate: vi.fn().mockResolvedValue({
        action: "SPEAK",
        reason: "Missing message",
        evidence: [],
      } as Recommendation),
    }

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.source).toBe("deterministic")
    expect(result.decision.reason).toBe(
      "Intelligence provider returned an invalid recommendation",
    )
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("reconsiders WAIT and delivers SPEAK when the condition is met", async () => {
    const provider = createProvider({
      action: "WAIT",
      reason: "More context is needed",
      evidence: ["Insufficient context"],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    })

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const initialResult = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(initialResult.decision.action).toBe("WAIT")
    expect(initialResult.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])

    provider.evaluate = vi.fn().mockResolvedValue({
      action: "SPEAK",
      reason: "The reconsideration condition was met",
      evidence: ["The scheduled reconsideration time was reached"],
      message: "Now is a good time to speak.",
    })

    const reconsideredDecision =
      await engine.evaluateReconsideredWait(
        initialResult.decision.recommendation!,
        event,
        state,
        "2026-01-01T10:05:00.000Z",
      )

    const interaction = await executeInteraction(
      reconsideredDecision,
      delivery,
    )

    expect(reconsideredDecision.action).toBe("SPEAK")
    expect(reconsideredDecision.source).toBe("llm")
    expect(interaction).toEqual({
      eventId: "event-1",
      message: "Now is a good time to speak.",
      reason: "The reconsideration condition was met",
    })

    expect(delivery.getDelivered()).toEqual([
      {
        eventId: "event-1",
        message: "Now is a good time to speak.",
        reason: "The reconsideration condition was met",
      },
    ])

    expect(provider.evaluate).toHaveBeenCalledTimes(1)
  })

  it("keeps WAIT when the reconsideration condition has not been met", async () => {
    const provider = createProvider({
      action: "WAIT",
      reason: "More context is needed",
      evidence: ["Insufficient context"],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    })

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const initialResult = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    const reconsideredDecision =
      await engine.evaluateReconsideredWait(
        initialResult.decision.recommendation!,
        event,
        state,
        "2026-01-01T10:04:00.000Z",
      )

    const interaction = await executeInteraction(
      reconsideredDecision,
      delivery,
    )

    expect(reconsideredDecision.action).toBe("WAIT")
    expect(reconsideredDecision.source).toBe("deterministic")
    expect(reconsideredDecision.reason).toBe(
      "WAIT reconsideration condition has not been met",
    )
    expect(interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
    expect(provider.evaluate).toHaveBeenCalledTimes(1)
  })

  it("silences an expired WAIT without consulting intelligence again", async () => {
    const provider = createProvider({
      action: "WAIT",
      reason: "More context is needed",
      evidence: ["Insufficient context"],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    })

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const initialResult = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    const reconsideredDecision =
      await engine.evaluateReconsideredWait(
        initialResult.decision.recommendation!,
        event,
        state,
        "2026-01-01T11:00:00.000Z",
      )

    const interaction = await executeInteraction(
      reconsideredDecision,
      delivery,
    )

    expect(reconsideredDecision.action).toBe("SILENCE")
    expect(reconsideredDecision.source).toBe("deterministic")
    expect(reconsideredDecision.reason).toBe(
      "WAIT has expired",
    )
    expect(interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
    expect(provider.evaluate).toHaveBeenCalledTimes(1)
  })

  it("silences an invalid WAIT with a malformed reconsideration condition", async () => {
    const provider: IntelligenceProvider = {
      evaluate: vi.fn().mockResolvedValue({
        action: "WAIT",
        reason: "Malformed condition",
        evidence: ["Invalid condition"],
        reconsiderWhen: {
          type: "unsupported",
        },
        expiresAt: "2026-01-01T11:00:00.000Z",
      } as Recommendation),
    }

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.source).toBe("deterministic")
    expect(result.decision.reason).toBe(
      "Intelligence provider returned an invalid recommendation",
    )
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("silences an invalid WAIT with a malformed expiry", async () => {
    const provider: IntelligenceProvider = {
      evaluate: vi.fn().mockResolvedValue({
        action: "WAIT",
        reason: "Malformed expiry",
        evidence: ["Invalid expiry"],
        reconsiderWhen: {
          type: "time",
          at: "2026-01-01T10:05:00.000Z",
        },
        expiresAt: "not-a-date",
      } as Recommendation),
    }

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.source).toBe("deterministic")
    expect(result.decision.reason).toBe(
      "Intelligence provider returned an invalid recommendation",
    )
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("silences an invalid SPEAK with an empty message", async () => {
    const provider: IntelligenceProvider = {
      evaluate: vi.fn().mockResolvedValue({
        action: "SPEAK",
        reason: "Missing usable message",
        evidence: ["Empty message"],
        message: "   ",
      } as Recommendation),
    }

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.source).toBe("deterministic")
    expect(result.decision.reason).toBe(
      "Intelligence provider returned an invalid recommendation",
    )
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("silences an invalid SILENCE with an empty reason", async () => {
    const provider: IntelligenceProvider = {
      evaluate: vi.fn().mockResolvedValue({
        action: "SILENCE",
        reason: "",
        evidence: ["No reason provided"],
      } as Recommendation),
    }

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.source).toBe("deterministic")
    expect(result.decision.reason).toBe(
      "Intelligence provider returned an invalid recommendation",
    )
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("silences an invalid WAIT when it expires before reconsideration", async () => {
    const provider = createProvider({
      action: "WAIT",
      reason: "Invalid time ordering",
      evidence: ["Expiry occurs first"],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T11:00:00.000Z",
      },
      expiresAt: "2026-01-01T10:30:00.000Z",
    })

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.source).toBe("deterministic")
    expect(result.decision.reason).toBe(
      "Intelligence provider returned an invalid recommendation",
    )
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })
})