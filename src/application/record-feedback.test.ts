import { describe, expect, it } from "vitest"
import { recordFeedback } from "@/application/record-feedback"
import { InMemoryFeedbackRecorder } from "@/feedback/in-memory"

describe("feedback recording", () => {
  it("records feedback from the FEEDBACK lifecycle state", () => {
    const recorder = new InMemoryFeedbackRecorder()

    const entry = recordFeedback(
      "FEEDBACK",
      "event-1",
      {
        useful: true,
        note: "The timing was good",
      },
      recorder,
      "2026-09-21T12:00:00.000Z",
    )

    expect(entry).toEqual({
      eventId: "event-1",
      data: {
        useful: true,
        note: "The timing was good",
      },
      recordedAt: "2026-09-21T12:00:00.000Z",
    })

    expect(recorder.getEntries()).toEqual([entry])
  })

  it("rejects feedback from a non-feedback lifecycle state", () => {
    const recorder = new InMemoryFeedbackRecorder()

    expect(() =>
      recordFeedback(
        "INITIATED",
        "event-1",
        { useful: true },
        recorder,
        "2026-09-21T12:00:00.000Z",
      ),
    ).toThrow(
      "Feedback cannot be recorded from lifecycle state: INITIATED",
    )

    expect(recorder.getEntries()).toEqual([])
  })
})