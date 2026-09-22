import { describe, expect, it } from "vitest"
import type { Event } from "@/events/types"
import { ProactivityEngine } from "@/engine/engine"
import type { Recommendation } from "@/engine/types"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type { EvaluationContext } from "@/intelligence/context"
import type { UserState } from "@/state/types"
import { InMemoryFeedbackRecorder } from "@/feedback/in-memory"

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

class ContextAwareProvider
  implements IntelligenceProvider
{
  async evaluate(
    _event: Event,
    _state: UserState,
    context: EvaluationContext,
  ): Promise<Recommendation> {
    if (context.feedback.length > 0) {
      return {
        action: "SPEAK",
        reason: "Previous feedback supports an interaction",
        evidence: [
          "Relevant feedback is available",
        ],
        message: "This interaction is informed by previous feedback.",
      }
    }

    return {
      action: "SILENCE",
      reason: "No relevant feedback is available",
      evidence: [
        "Evaluation context contains no feedback",
      ],
    }
  }
}

describe("engine evaluation context", () => {
  it("allows the intelligence provider to use relevant feedback", async () => {
    const feedback = new InMemoryFeedbackRecorder()

    feedback.record({
      eventId: "event-1",
      data: {
        useful: true,
      },
      recordedAt: "2026-09-22T04:01:00.000Z",
    })

    const provider = new ContextAwareProvider()

    const engine = new ProactivityEngine(
      provider,
      feedback,
    )

    const decision = await engine.evaluate(
      event,
      state,
    )

    expect(decision.action).toBe("SPEAK")
    expect(decision.source).toBe("llm")
    expect(decision.reason).toBe(
      "Previous feedback supports an interaction",
    )
    expect(decision.recommendation).toEqual({
      action: "SPEAK",
      reason: "Previous feedback supports an interaction",
      evidence: [
        "Relevant feedback is available",
      ],
      message:
        "This interaction is informed by previous feedback.",
    })
  })

  it("allows the intelligence provider to distinguish an empty context", async () => {
    const provider = new ContextAwareProvider()

    const engine = new ProactivityEngine(
      provider,
    )

    const decision = await engine.evaluate(
      event,
      state,
    )

    expect(decision.action).toBe("SILENCE")
    expect(decision.source).toBe("llm")
    expect(decision.reason).toBe(
      "No relevant feedback is available",
    )
  })
})