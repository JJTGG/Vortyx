import { describe, expect, it } from "vitest"
import type { InteractionDelivery } from "@/interaction/delivery"
import type { InteractionRequest } from "@/interaction/types"

describe("InteractionDelivery", () => {
  it("defines the delivery contract", async () => {
    const delivered: InteractionRequest[] = []

    const delivery: InteractionDelivery = {
      async deliver(request) {
        delivered.push(request)
      },
    }

    const request: InteractionRequest = {
      eventId: "event-1",
      message: "Something needs your attention.",
      reason: "The situation justifies interaction",
    }

    await delivery.deliver(request)

    expect(delivered).toEqual([request])
  })
})