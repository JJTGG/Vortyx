import { describe, expect, it, vi } from "vitest"
import { ProactivityEngine } from "@/engine/engine"
import type { Event } from "@/events/types"
import type { InteractionDelivery } from "@/interaction/delivery"
import { processEvent } from "@/application/process-event"
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

describe("processEvent", () => {
  it("evaluates an event and delivers a SPEAK interaction", async () => {
    const engine = new ProactivityEngine({
      evaluate: vi.fn().mockResolvedValue({
        action: "SPEAK",
        reason: "The event is relevant",
        evidence: ["Relevant signal"],
        message: "Something needs your attention.",
      }),
    })

    const delivery: InteractionDelivery = {
      deliver: vi.fn().mockResolvedValue(undefined),
    }

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("SPEAK")
    expect(result.interaction).toEqual({
      eventId: "event-1",
      message: "Something needs your attention.",
      reason: "The event is relevant",
    })

    expect(delivery.deliver).toHaveBeenCalledOnce()
  })

  it("does not deliver when the engine decides SILENCE", async () => {
    const engine = new ProactivityEngine()

    const delivery: InteractionDelivery = {
      deliver: vi.fn().mockResolvedValue(undefined),
    }

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
    expect(result.interaction).toBeNull()
    expect(delivery.deliver).not.toHaveBeenCalled()
  })

  it("does not deliver when the engine decides WAIT", async () => {
    const engine = new ProactivityEngine({
      evaluate: vi.fn().mockResolvedValue({
        action: "WAIT",
        reason: "More context is needed",
        evidence: ["Insufficient context"],
        reconsiderWhen: {
          type: "time",
          at: "2026-01-01T10:05:00.000Z",
        },
        expiresAt: "2026-01-01T11:00:00.000Z",
      }),
    })

    const delivery: InteractionDelivery = {
      deliver: vi.fn().mockResolvedValue(undefined),
    }

    const result = await processEvent(
      event,
      state,
      engine,
      delivery,
    )

    expect(result.decision.action).toBe("WAIT")
    expect(result.interaction).toBeNull()
    expect(delivery.deliver).not.toHaveBeenCalled()
  })

  it("propagates delivery failures", async () => {
    const engine = new ProactivityEngine({
      evaluate: vi.fn().mockResolvedValue({
        action: "SPEAK",
        reason: "The event is relevant",
        evidence: ["Relevant signal"],
        message: "Something needs your attention.",
      }),
    })

    const error = new Error("Delivery failed")

    const delivery: InteractionDelivery = {
      deliver: vi.fn().mockRejectedValue(error),
    }

    await expect(
      processEvent(
        event,
        state,
        engine,
        delivery,
      ),
    ).rejects.toBe(error)
  })
})