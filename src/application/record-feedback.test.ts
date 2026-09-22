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

  it("retrieves feedback for a specific event", () => {
    const recorder = new InMemoryFeedbackRecorder()

    const first = recordFeedback(
      "FEEDBACK",
      "event-1",
      { useful: true },
      recorder,
      "2026-09-21T12:00:00.000Z",
    )

    const second = recordFeedback(
      "FEEDBACK",
      "event-2",
      { useful: false },
      recorder,
      "2026-09-21T12:01:00.000Z",
    )

    const third = recordFeedback(
      "FEEDBACK",
      "event-1",
      { useful: false },
      recorder,
      "2026-09-21T12:02:00.000Z",
    )

    expect(recorder.getByEventId("event-1")).toEqual([
      first,
      third,
    ])

    expect(recorder.getByEventId("event-2")).toEqual([
      second,
    ])

    expect(recorder.getByEventId("missing")).toEqual([])
  })

  it("retrieves recent feedback newest first", () => {
    const recorder = new InMemoryFeedbackRecorder()

    const first = recordFeedback(
      "FEEDBACK",
      "event-1",
      { useful: true },
      recorder,
      "2026-09-21T12:00:00.000Z",
    )

    const second = recordFeedback(
      "FEEDBACK",
      "event-2",
      { useful: false },
      recorder,
      "2026-09-21T12:01:00.000Z",
    )

    const third = recordFeedback(
      "FEEDBACK",
      "event-3",
      { useful: true },
      recorder,
      "2026-09-21T12:02:00.000Z",
    )

    expect(recorder.getRecent(2)).toEqual([
      third,
      second,
    ])

    expect(recorder.getRecent(10)).toEqual([
      third,
      second,
      first,
    ])
  })

  it("rejects an invalid recent-feedback limit", () => {
    const recorder = new InMemoryFeedbackRecorder()

    expect(() => recorder.getRecent(-1)).toThrow(
      "Feedback limit must be a non-negative integer",
    )

    expect(() => recorder.getRecent(1.5)).toThrow(
      "Feedback limit must be a non-negative integer",
    )
  })
})