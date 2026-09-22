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

class ContextCapturingProvider
  implements IntelligenceProvider
{
  context: EvaluationContext | null = null

  async evaluate(
    _event: Event,
    _state: UserState,
    context: EvaluationContext,
  ): Promise<Recommendation> {
    this.context = context

    return {
      action: "SILENCE",
      reason: "Test provider",
      evidence: [],
    }
  }
}

describe("engine evaluation context", () => {
  it("passes relevant feedback to the intelligence provider", async () => {
    const feedback = new InMemoryFeedbackRecorder()

    feedback.record({
      eventId: "event-1",
      data: {
        useful: true,
      },
      recordedAt: "2026-09-22T04:01:00.000Z",
    })

    const provider = new ContextCapturingProvider()

    const engine = new ProactivityEngine(
      provider,
      feedback,
    )

    const decision = await engine.evaluate(
      event,
      state,
    )

    expect(decision.action).toBe("SILENCE")
    expect(provider.context).toEqual({
      feedback: [
        {
          eventId: "event-1",
          data: {
            useful: true,
          },
          recordedAt: "2026-09-22T04:01:00.000Z",
        },
      ],
    })
  })

  it("provides empty feedback context when no feedback query exists", async () => {
    const provider = new ContextCapturingProvider()

    const engine = new ProactivityEngine(provider)

    await engine.evaluate(event, state)

    expect(provider.context).toEqual({
      feedback: [],
    })
  })
})