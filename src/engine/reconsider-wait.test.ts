import { describe, expect, it } from "vitest"
import type { Event } from "@/events/types"
import type { Recommendation } from "@/engine/types"
import { reconsiderWait } from "@/engine/reconsider-wait"

const wait: Recommendation = {
  action: "WAIT",
  reason: "Need more context",
  evidence: ["Only one signal exists"],
  reconsiderWhen: {
    type: "event",
    eventType: "user_action",
  },
  expiresAt: "2026-01-01T12:00:00.000Z",
}

const baseEvent: Event = {
  id: "event-2",
  type: "unknown",
  timestamp: "2026-01-01T10:30:00.000Z",
  source: "test",
  data: {},
}

describe("reconsiderWait", () => {
  it("reconsiders when the WAIT condition is met", () => {
    const event: Event = {
      ...baseEvent,
      type: "user_action",
    }

    expect(
      reconsiderWait(
        wait,
        event,
        "2026-01-01T11:00:00.000Z",
      ),
    ).toEqual({
      action: "RECONSIDER",
      reason: "WAIT reconsideration condition was met",
    })
  })

  it("keeps waiting when the condition is not met", () => {
    expect(
      reconsiderWait(
        wait,
        baseEvent,
        "2026-01-01T11:00:00.000Z",
      ),
    ).toEqual({
      action: "KEEP_WAITING",
      reason: "WAIT reconsideration condition has not been met",
    })
  })

  it("expires an expired WAIT", () => {
    expect(
      reconsiderWait(
        wait,
        baseEvent,
        "2026-01-01T12:00:00.000Z",
      ),
    ).toEqual({
      action: "EXPIRED",
      reason: "WAIT has expired",
    })
  })

  it("rejects invalid WAIT time boundaries", () => {
    const invalidWait: Recommendation = {
      ...wait,
      expiresAt: "not-a-date",
    }

    expect(
      reconsiderWait(
        invalidWait,
        baseEvent,
        "2026-01-01T11:00:00.000Z",
      ),
    ).toEqual({
      action: "EXPIRED",
      reason: "WAIT contains an invalid time boundary",
    })
  })

  it("does not treat a non-WAIT recommendation as waiting", () => {
    const speak: Recommendation = {
      action: "SPEAK",
      reason: "Speak now",
      evidence: ["Relevant signal"],
    }

    expect(
      reconsiderWait(
        speak,
        baseEvent,
        "2026-01-01T11:00:00.000Z",
      ),
    ).toEqual({
      action: "EXPIRED",
      reason: "Only WAIT recommendations can be reconsidered",
    })
  })
})