import { describe, expect, it } from "vitest"
import type { Event } from "@/events/types"
import { ProactivityEngine } from "@/engine/engine"
import type { Recommendation } from "@/engine/types"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type { UserState } from "@/state/types"
import { InMemoryInteractionDelivery } from "@/interaction/in-memory-delivery"
import { processEvent } from "@/application/process-event"

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

describe("process event", () => {
  it("processes a SPEAK decision and delivers the interaction", async () => {
    const provider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        return {
          action: "SPEAK",
          reason: "Interaction is justified",
          evidence: ["Test evidence"],
          message: "A proactive message.",
        }
      },
    }

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SPEAK")
    expect(result.lifecycle).toBe("INITIATED")
    expect(result.interaction).toEqual({
      eventId: "event-1",
      message: "A proactive message.",
      reason: "Interaction is justified",
    })
    expect(delivery.getDelivered()).toEqual([
      result.interaction,
    ])
  })

  it("processes a SILENCE decision without delivering an interaction", async () => {
    const provider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        return {
          action: "SILENCE",
          reason: "Interaction is not justified",
          evidence: ["Test evidence"],
        }
      },
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
    expect(result.lifecycle).toBe("SILENCED")
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("processes an explicit WAIT decision without delivering an interaction", async () => {
    const provider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        return {
          action: "WAIT",
          reason: "More evidence is needed",
          evidence: ["Test evidence"],
          reconsiderWhen: {
            type: "time",
            at: "2026-09-22T04:05:00.000Z",
          },
          expiresAt: "2026-09-22T05:00:00.000Z",
        }
      },
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
    expect(result.lifecycle).toBe("QUEUED")
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("uses the default intelligence provider when none is supplied", async () => {
    const engine = new ProactivityEngine()
    const delivery = new InMemoryInteractionDelivery()

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SILENCE")
    expect(result.decision.source).toBe("llm")
    expect(result.decision.reason).toBe(
      "No relevant feedback is available",
    )
    expect(result.lifecycle).toBe("SILENCED")
    expect(result.interaction).toBeNull()
    expect(delivery.getDelivered()).toEqual([])
  })

  it("falls back to bounded WAIT when the intelligence provider fails", async () => {
    const provider: IntelligenceProvider = {
      async evaluate(): Promise<Recommendation> {
        throw new Error("Provider failure")
      },
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
    expect(result.decision.recommendation).toEqual({
      action: "WAIT",
      reason: "Intelligence provider failed",
      evidence: [],
      reconsiderWhen: {
        type: "time",
        at: "2026-09-22T04:05:00.000Z",
      },
      expiresAt: "2026-09-22T05:00:00.000Z",
    })
    expect(result.lifecycle).toBe("QUEUED")
    expect(result.interaction).toBeNull()
  })
})