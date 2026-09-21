import { describe, expect, it } from "vitest"
import { InMemoryInteractionDelivery } from "@/interaction/in-memory-delivery"

describe("InMemoryInteractionDelivery", () => {
  it("stores delivered interactions", async () => {
    const delivery = new InMemoryInteractionDelivery()

    const request = {
      eventId: "event-1",
      message: "Something needs your attention.",
      reason: "The situation justifies interaction",
    }

    await delivery.deliver(request)

    expect(delivery.getDelivered()).toEqual([request])
  })

  it("preserves delivery order", async () => {
    const delivery = new InMemoryInteractionDelivery()

    const first = {
      eventId: "event-1",
      message: "First interaction.",
      reason: "First reason",
    }

    const second = {
      eventId: "event-2",
      message: "Second interaction.",
      reason: "Second reason",
    }

    await delivery.deliver(first)
    await delivery.deliver(second)

    expect(delivery.getDelivered()).toEqual([first, second])
  })

  it("returns a copy of delivered interactions", async () => {
    const delivery = new InMemoryInteractionDelivery()

    const request = {
      eventId: "event-1",
      message: "Test interaction.",
      reason: "Test reason",
    }

    await delivery.deliver(request)

    const delivered = delivery.getDelivered()
    delivered.length = 0

    expect(delivery.getDelivered()).toEqual([request])
  })

  it("can clear delivered interactions", async () => {
    const delivery = new InMemoryInteractionDelivery()

    await delivery.deliver({
      eventId: "event-1",
      message: "Test interaction.",
      reason: "Test reason",
    })

    delivery.clear()

    expect(delivery.getDelivered()).toEqual([])
  })
})