import { describe, expect, it } from "vitest"
import type { Event } from "@/events/types"
import type { UserState } from "@/state/types"
import { RuleBasedIntelligenceProvider } from "@/intelligence/rule-based"

const event: Event = {
  id: "event-1",
  type: "unknown",
  timestamp: "2026-09-22T04:00:00.000Z",
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

describe("rule-based intelligence provider", () => {
  it("recommends SPEAK when relevant feedback exists", async () => {
    const provider = new RuleBasedIntelligenceProvider()

    const recommendation = await provider.evaluate(
      event,
      state,
      {
        feedback: [
          {
            eventId: "event-1",
            data: {
              useful: true,
            },
            recordedAt:
              "2026-09-22T04:01:00.000Z",
          },
        ],
      },
    )

    expect(recommendation).toEqual({
      action: "SPEAK",
      reason: "Relevant feedback is available",
      evidence: [
        "Evaluation context contains relevant feedback",
      ],
      message:
        "This interaction is informed by previous feedback.",
    })
  })

  it("recommends SILENCE when no relevant feedback exists", async () => {
    const provider = new RuleBasedIntelligenceProvider()

    const recommendation = await provider.evaluate(
      event,
      state,
      {
        feedback: [],
      },
    )

    expect(recommendation).toEqual({
      action: "SILENCE",
      reason: "No relevant feedback is available",
      evidence: [
        "Event type: unknown",
        "Evaluation context contains no feedback",
      ],
    })
  })
})