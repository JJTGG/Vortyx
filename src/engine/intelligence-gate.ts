import type { Event } from "@/events/types"

export type IntelligenceNeed =
  | {
      required: false
      reason: string
    }
  | {
      required: true
      reason: string
    }

export function determineIntelligenceNeed(event: Event): IntelligenceNeed {
  switch (event.type) {
    case "system":
      return {
        required: false,
        reason: "System events can be handled deterministically",
      }

    case "user_action":
      return {
        required: false,
        reason: "User actions can be handled deterministically",
      }

    default:
      return {
        required: true,
        reason: "Unknown event type requires contextual interpretation",
      }
  }
}