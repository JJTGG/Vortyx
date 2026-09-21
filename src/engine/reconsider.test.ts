import { describe, expect, it } from "vitest"
import type { Event } from "@/events/types"
import type { ReconsiderCondition } from "@/engine/types"
import { shouldReconsider } from "@/engine/reconsider"

const baseEvent: Event = {
  id: "event-1",
  type: "unknown",
  timestamp: "2026-01-01T10:00:00.000Z",
  source: "test",
  data: {},
}

describe("shouldReconsider", () => {
  it("reconsiders when a time condition has been reached", () => {
    const condition: ReconsiderCondition = {
      type: "time",
      at: "2026-01-01T10:05:00.000Z",
    }

    expect(
      shouldReconsider(
        condition,
        baseEvent,
        "2026-01-01T10:05:00.000Z",
      ),
    ).toBe(true)
  })

  it("does not reconsider before a time condition", () => {
    const condition: ReconsiderCondition = {
      type: "time",
      at: "2026-01-01T10:05:00.000Z",
    }

    expect(
      shouldReconsider(
        condition,
        baseEvent,
        "2026-01-01T10:04:59.000Z",
      ),
    ).toBe(false)
  })

  it("reconsiders when the expected event occurs", () => {
    const condition: ReconsiderCondition = {
      type: "event",
      eventType: "user_action",
    }

    const event: Event = {
      ...baseEvent,
      type: "user_action",
    }

    expect(
      shouldReconsider(
        condition,
        event,
        "2026-01-01T10:01:00.000Z",
      ),
    ).toBe(true)
  })

  it("does not reconsider for an unrelated event", () => {
    const condition: ReconsiderCondition = {
      type: "event",
      eventType: "user_action",
    }

    expect(
      shouldReconsider(
        condition,
        baseEvent,
        "2026-01-01T10:01:00.000Z",
      ),
    ).toBe(false)
  })

  it("reconsiders when a state-change field is present", () => {
    const condition: ReconsiderCondition = {
      type: "state_change",
      field: "focus",
    }

    const event: Event = {
      ...baseEvent,
      data: {
        focus: "coding",
      },
    }

    expect(
      shouldReconsider(
        condition,
        event,
        "2026-01-01T10:01:00.000Z",
      ),
    ).toBe(true)
  })

  it("reconsiders when new evidence is present", () => {
    const condition: ReconsiderCondition = {
      type: "new_evidence",
      description: "A new relevant signal appears",
    }

    const event: Event = {
      ...baseEvent,
      data: {
        signal: "relevant",
      },
    }

    expect(
      shouldReconsider(
        condition,
        event,
        "2026-01-01T10:01:00.000Z",
      ),
    ).toBe(true)
  })
})