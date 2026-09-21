import { describe, expect, it } from "vitest"
import { prepareInteraction } from "@/interaction/prepare"
import type { Decision } from "@/engine/types"

describe("prepareInteraction", () => {
  it("prepares a SPEAK decision with a message", () => {
    const decision: Decision = {
      action: "SPEAK",
      reason: "The situation justifies interaction",
      eventId: "event-1",
      source: "llm",
      recommendation: {
        action: "SPEAK",
        reason: "The situation justifies interaction",
        evidence: ["Relevant signal"],
        message: "This is worth bringing to your attention.",
      },
    }

    expect(prepareInteraction(decision)).toEqual({
      eventId: "event-1",
      message: "This is worth bringing to your attention.",
      reason: "The situation justifies interaction",
    })
  })

  it("does not prepare an interaction for SILENCE", () => {
    const decision: Decision = {
      action: "SILENCE",
      reason: "No interaction is justified",
      eventId: "event-1",
      source: "deterministic",
    }

    expect(prepareInteraction(decision)).toBeNull()
  })

  it("does not prepare an interaction for WAIT", () => {
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

    expect(prepareInteraction(decision)).toBeNull()
  })

  it("does not prepare an interaction when SPEAK has no message", () => {
    const decision: Decision = {
      action: "SPEAK",
      reason: "Interaction is justified",
      eventId: "event-1",
      source: "llm",
      recommendation: {
        action: "SPEAK",
        reason: "Interaction is justified",
        evidence: ["Relevant signal"],
      },
    }

    expect(prepareInteraction(decision)).toBeNull()
  })

  it("does not prepare an interaction when the message is empty", () => {
    const decision: Decision = {
      action: "SPEAK",
      reason: "Interaction is justified",
      eventId: "event-1",
      source: "llm",
      recommendation: {
        action: "SPEAK",
        reason: "Interaction is justified",
        evidence: ["Relevant signal"],
        message: "   ",
      },
    }

    expect(prepareInteraction(decision)).toBeNull()
  })
})