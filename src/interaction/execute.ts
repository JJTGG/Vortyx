import type { Decision } from "@/engine/types"
import type { InteractionDelivery } from "@/interaction/delivery"
import { prepareInteraction } from "@/interaction/prepare"
import type { InteractionRequest } from "@/interaction/types"

export async function executeInteraction(
  decision: Decision,
  delivery: InteractionDelivery,
): Promise<InteractionRequest | null> {
  const request = prepareInteraction(decision)

  if (request === null) {
    return null
  }

  await delivery.deliver(request)

  return request
}