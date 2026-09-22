import { describe, expect, it } from "vitest"
import { getFeedbackContext } from "@/feedback/context"
import { InMemoryFeedbackRecorder } from "@/feedback/in-memory"

describe("feedback context", () => {
  it("retrieves feedback for an event", () => {
    const recorder = new InMemoryFeedbackRecorder()

    recorder.record({
      eventId: "event-1",
      data: {
        useful: true,
      },
      recordedAt: "2026-09-22T04:00:00.000Z",
    })

    recorder.record({
      eventId: "event-2",
      data: {
        useful: false,
      },
      recordedAt: "2026-09-22T04:01:00.000Z",
    })

    recorder.record({
      eventId: "event-1",
      data: {
        useful: false,
      },
      recordedAt: "2026-09-22T04:02:00.000Z",
    })

    expect(
      getFeedbackContext("event-1", recorder),
    ).toEqual([
      {
        eventId: "event-1",
        data: {
          useful: true,
        },
        recordedAt: "2026-09-22T04:00:00.000Z",
      },
      {
        eventId: "event-1",
        data: {
          useful: false,
        },
        recordedAt: "2026-09-22T04:02:00.000Z",
      },
    ])
  })

  it("returns an empty list when no feedback exists", () => {
    const recorder = new InMemoryFeedbackRecorder()

    expect(
      getFeedbackContext("missing", recorder),
    ).toEqual([])
  })
})