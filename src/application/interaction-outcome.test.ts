import { describe, expect, it } from "vitest"
import {
  recordInteractionOutcome,
  recordInteractionOutcomeAndFeedback,
} from "@/application/interaction-outcome"
import { InMemoryFeedbackRecorder } from "@/feedback/in-memory"

describe("interaction outcome lifecycle", () => {
  it("tracks a user response through feedback", () => {
    const result = recordInteractionOutcome(
      "INITIATED",
      "USER_RESPONDED",
    )

    expect(result.lifecycle).toBe("FEEDBACK")
  })

  it("tracks an ignored interaction through feedback", () => {
    const result = recordInteractionOutcome(
      "INITIATED",
      "IGNORED",
    )

    expect(result.lifecycle).toBe("FEEDBACK")
  })

  it("rejects outcomes from non-initiated states", () => {
    expect(() =>
      recordInteractionOutcome(
        "QUEUED",
        "IGNORED",
      ),
    ).toThrow(
      "Interaction outcome cannot be applied from lifecycle state: QUEUED",
    )
  })

  it("records feedback after an interaction outcome", () => {
    const recorder = new InMemoryFeedbackRecorder()

    const result = recordInteractionOutcomeAndFeedback(
      "INITIATED",
      "USER_RESPONDED",
      "event-1",
      {
        useful: true,
        note: "Good timing",
      },
      recorder,
      "2026-09-22T04:30:00.000Z",
    )

    expect(result.lifecycle).toBe("FEEDBACK")
    expect(result.feedback).toEqual({
      eventId: "event-1",
      data: {
        useful: true,
        note: "Good timing",
      },
      recordedAt: "2026-09-22T04:30:00.000Z",
    })

    expect(recorder.getEntries()).toEqual([
      result.feedback,
    ])
  })
})