import { describe, expect, it } from "vitest"
import { createWaitDecision } from "@/engine/wait"

describe("createWaitDecision", () => {
  it("creates a time-based WAIT with an expiry", () => {
    const wait = createWaitDecision(
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
      reconsiderWhen: {
        type: "time",
        at: "2026-01-01T10:05:00.000Z",
      },
      expiresAt: "2026-01-01T11:00:00.000Z",
    })
  })

  it("preserves event-based reconsideration", () => {
    const wait = createWaitDecision(
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