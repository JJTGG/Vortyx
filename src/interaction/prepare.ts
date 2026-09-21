import type { Decision } from "@/engine/types"
import type { InteractionRequest } from "@/interaction/types"

export function prepareInteraction(
  decision: Decision,
): InteractionRequest | null {
  if (
    decision.action !== "SPEAK" ||
    decision.recommendation?.action !== "SPEAK"
  ) {
    return null
  }

  const message = decision.recommendation.message

  if (
    typeof message !== "string" ||
    message.trim().length === 0
  ) {
    return null
  }

  return {
    eventId: decision.eventId,
    message,
    reason: decision.reason,
  }
}