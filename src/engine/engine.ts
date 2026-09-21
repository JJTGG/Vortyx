import type { Event } from "@/events/types"
import type { UserState } from "@/state/types"
import type { Decision } from "@/engine/types"

export class ProactivityEngine {
  evaluate(event: Event, state: UserState): Decision {
    if (!state.preferences.proactiveEnabled) {
      return {
        action: "SILENCE",
        reason: "Proactive interactions are disabled",
        eventId: event.id,
        source: "deterministic",
      }
    }

    const duplicate = state.recentEvents.some(
      (recentEvent) =>
        recentEvent.type === event.type &&
        recentEvent.source === event.source,
      )

    if (duplicate) {
      return {
        action: "SILENCE",
        reason: "Duplicate event detected",
        eventId: event.id,
        source: "deterministic",
      }
    }

    return {
      action: "SILENCE",
      reason: "No deterministic rule justifies an interaction",
      eventId: event.id,
      source: "deterministic",
    }
  }
}