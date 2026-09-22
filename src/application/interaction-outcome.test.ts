import { describe, expect, it } from "vitest"
import {
  recordInteractionOutcome,
} from "@/application/interaction-outcome"

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
})