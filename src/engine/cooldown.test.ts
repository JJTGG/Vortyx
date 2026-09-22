import { describe, expect, it } from "vitest"
import {
  isWithinProactiveCooldown,
  PROACTIVE_COOLDOWN_MS,
} from "@/engine/cooldown"
import { InMemoryInteractionHistory } from "@/interaction/in-memory-history"

describe("proactive cooldown", () => {
  it("returns false when there is no interaction history", () => {
    const history = new InMemoryInteractionHistory()

    expect(
      isWithinProactiveCooldown(
        "2026-09-22T05:00:00.000Z",
        history,
      ),
    ).toBe(false)
  })

  it("returns true when the latest interaction is within the cooldown", () => {
    const history = new InMemoryInteractionHistory()

    history.record({
      eventId: "event-1",
      message: "Hello",
      reason: "Test interaction",
      initiatedAt: "2026-09-22T04:45:00.000Z",
    })

    expect(
      isWithinProactiveCooldown(
        "2026-09-22T05:00:00.000Z",
        history,
      ),
    ).toBe(true)
  })

  it("returns false when the cooldown has expired", () => {
    const history = new InMemoryInteractionHistory()

    history.record({
      eventId: "event-1",
      message: "Hello",
      reason: "Test interaction",
      initiatedAt: "2026-09-22T04:00:00.000Z",
    })

    expect(
      isWithinProactiveCooldown(
        "2026-09-22T04:30:00.000Z",
        history,
      ),
    ).toBe(false)
  })

  it("uses the latest interaction", () => {
    const history = new InMemoryInteractionHistory()

    history.record({
      eventId: "event-1",
      message: "Older",
      reason: "Test interaction",
      initiatedAt: "2026-09-22T03:00:00.000Z",
    })

    history.record({
      eventId: "event-2",
      message: "Latest",
      reason: "Test interaction",
      initiatedAt: "2026-09-22T04:50:00.000Z",
    })

    expect(
      isWithinProactiveCooldown(
        "2026-09-22T05:00:00.000Z",
        history,
      ),
    ).toBe(true)
  })

  it("does not activate for an interaction in the future", () => {
    const history = new InMemoryInteractionHistory()

    history.record({
      eventId: "event-1",
      message: "Hello",
      reason: "Test interaction",
      initiatedAt: "2026-09-22T05:05:00.000Z",
    })

    expect(
      isWithinProactiveCooldown(
        "2026-09-22T05:00:00.000Z",
        history,
      ),
    ).toBe(false)
  })

  it("uses the configured thirty-minute cooldown", () => {
    expect(PROACTIVE_COOLDOWN_MS).toBe(
      30 * 60 * 1000,
    )
  })
})