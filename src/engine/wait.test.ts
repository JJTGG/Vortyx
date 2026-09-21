import { describe, expect, it } from "vitest"
import { createWaitRecommendation } from "@/engine/wait"

describe("createWaitRecommendation", () => {
  it("creates a time-based WAIT with an expiry", () => {
    const wait = createWaitRecommendation(
      "Intelligence provider is unavailable",
      {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      "2026-01-01T11:00:00.000Z",
    )

    expect(wait).toEqual({
      action: "WAIT",
      reason: "Intelligence provider is unavailable",
      evidence: [],
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    })
  })

  it("preserves event-based reconsideration", () => {
    const wait = createWaitRecommendation(
      "Need another relevant event",
      {
        type: "event",
        eventType: "user_action",
      },
      "2026-01-01T12:00:00.000Z",
    )

    expect(wait.reconsiderWhen).toEqual({
      type: "event",
      eventType: "user_action",
    })

    expect(wait.expiresAt).toBe("2026-01-01T12:00:00.000Z")
  })
})