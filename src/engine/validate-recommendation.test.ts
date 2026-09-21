import { describe, expect, it } from "vitest"
import { validateRecommendation } from "@/engine/validate-recommendation"

describe("validateRecommendation", () => {
  it("accepts a valid SPEAK recommendation", () => {
    expect(
      validateRecommendation({
        action: "SPEAK",
        reason: "The user needs an immediate reminder",
        evidence: ["A relevant event just occurred"],
        message: "You may want to check this.",
      }),
    ).toBe(true)
  })

  it("rejects SPEAK without a message", () => {
    expect(
      validateRecommendation({
        action: "SPEAK",
        reason: "The user needs an immediate reminder",
        evidence: ["A relevant event just occurred"],
      }),
    ).toBe(false)
  })

  it("rejects SPEAK with a blank message", () => {
    expect(
      validateRecommendation({
        action: "SPEAK",
        reason: "The user needs an immediate reminder",
        evidence: ["A relevant event just occurred"],
        message: "   ",
      }),
    ).toBe(false)
  })

  it("accepts a valid WAIT recommendation", () => {
    expect(
      validateRecommendation({
        action: "WAIT",
        reason: "More context is needed",
        evidence: ["Only one signal exists"],
        reconsiderWhen: {
          type: "event",
          eventType: "user_action",
        },
        expiresAt: "2026-01-01T12:00:00.000Z",
      }),
    ).toBe(true)
  })

  it("rejects WAIT without an expiry", () => {
    expect(
      validateRecommendation({
        action: "WAIT",
        reason: "More context is needed",
        evidence: ["Only one signal exists"],
        reconsiderWhen: {
          type: "event",
          eventType: "user_action",
        },
      }),
    ).toBe(false)
  })

  it("accepts a valid SILENCE recommendation", () => {
    expect(
      validateRecommendation({
        action: "SILENCE",
        reason: "No meaningful interaction is justified",
        evidence: ["Signal is low value"],
      }),
    ).toBe(true)
  })

  it("rejects an unknown action", () => {
    expect(
      validateRecommendation({
        action: "MAYBE",
        reason: "Uncertain",
        evidence: [],
      }),
    ).toBe(false)
  })

  it("rejects WAIT without reconsideration", () => {
    expect(
      validateRecommendation({
        action: "WAIT",
        reason: "Need more information",
        evidence: [],
        expiresAt: "2026-01-01T12:00:00.000Z",
      }),
    ).toBe(false)
  })

  it("rejects WAIT with an unsupported reconsideration type", () => {
    expect(
      validateRecommendation({
        action: "WAIT",
        reason: "Need more information",
        evidence: [],
        reconsiderWhen: {
          type: "whenever_the_model_wants",
        },
        expiresAt: "2026-01-01T12:00:00.000Z",
      }),
    ).toBe(false)
  })

  it("rejects WAIT with an invalid time condition", () => {
    expect(
      validateRecommendation({
        action: "WAIT",
        reason: "Try again later",
        evidence: [],
        reconsiderWhen: {
          type: "time",
          at: "sometime later",
        },
        expiresAt: "2026-01-01T12:00:00.000Z",
      }),
    ).toBe(false)
  })

  it("rejects WAIT with an invalid expiry", () => {
    expect(
      validateRecommendation({
        action: "WAIT",
        reason: "Try again later",
        evidence: [],
        reconsiderWhen: {
          type: "time",
          at: "2026-01-01T11:00:00.000Z",
        },
        expiresAt: "not a date",
      }),
    ).toBe(false)
  })

  it("rejects a malformed recommendation", () => {
    expect(validateRecommendation(null)).toBe(false)
    expect(validateRecommendation("SPEAK")).toBe(false)
    expect(validateRecommendation({})).toBe(false)
  })
})