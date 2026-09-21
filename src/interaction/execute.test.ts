import { describe, expect, it, vi } from "vitest"
import type { Decision } from "@/engine/types"
import type { InteractionDelivery } from "@/interaction/delivery"
import { executeInteraction } from "@/interaction/execute"

describe("executeInteraction", () => {
  it("prepares and delivers a SPEAK interaction", async () => {
    const delivery: InteractionDelivery = {
      deliver: vi.fn().mockResolvedValue(undefined),
    }

    const decision: Decision = {
      action: "SPEAK",
      reason: "The situation justifies interaction",
      eventId: "event-1",
      source: "llm",
      recommendation: {
        action: "SPEAK",
        reason: "The situation justifies interaction",
        evidence: ["Relevant signal"],
        message: "Something needs your attention.",
      },
    }

    const result = await executeInteraction(
      decision,
      delivery,
    )

    expect(result).toEqual({
      eventId: "event-1",
      message: "Something needs your attention.",
      reason: "The situation justifies interaction",
    })

    expect(delivery.deliver).toHaveBeenCalledOnce()
    expect(delivery.deliver).toHaveBeenCalledWith(result)
  })

  it("does not deliver SILENCE", async () => {
    const delivery: InteractionDelivery = {
      deliver: vi.fn().mockResolvedValue(undefined),
    }

    const decision: Decision = {
      action: "SILENCE",
      reason: "No interaction is justified",
      eventId: "event-1",
      source: "deterministic",
    }

    const result = await executeInteraction(
      decision,
      delivery,
    )

    expect(result).toBeNull()
    expect(delivery.deliver).not.toHaveBeenCalled()
  })

  it("does not deliver WAIT", async () => {
    const delivery: InteractionDelivery = {
      deliver: vi.fn().mockResolvedValue(undefined),
    }

    const decision: Decision = {
      action: "WAIT",
      reason: "Need more context",
      eventId: "event-1",
      source: "llm",
      recommendation: {
        action: "WAIT",
        reason: "Need more context",
        evidence: ["Insufficient context"],
        reconsiderWhen: {
          type: "time",
          at: "2026-01-01T10:05:00.000Z",
        },
        expiresAt: "2026-01-01T11:00:00.000Z",
      },
    }

    const result = await executeInteraction(
      decision,
      delivery,
    )

    expect(result).toBeNull()
    expect(delivery.deliver).not.toHaveBeenCalled()
  })

  it("propagates delivery failures", async () => {
    const error = new Error("Delivery failed")

    const delivery: InteractionDelivery = {
      deliver: vi.fn().mockRejectedValue(error),
    }

    const decision: Decision = {
      action: "SPEAK",
      reason: "The situation justifies interaction",
      eventId: "event-1",
      source: "llm",
      recommendation: {
        action: "SPEAK",
        reason: "The situation justifies interaction",
        evidence: ["Relevant signal"],
        message: "Something needs your attention.",
      },
    }

    await expect(
      executeInteraction(decision, delivery),
    ).rejects.toBe(error)
  })
})