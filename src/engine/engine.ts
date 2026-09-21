import type { Event } from "@/events/types"
import type { Decision } from "@/engine/types"
import { determineIntelligenceNeed } from "@/engine/intelligence-gate"
import { validateRecommendation } from "@/engine/validate-recommendation"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type { UserState } from "@/state/types"

export class ProactivityEngine {
  constructor(
    private readonly intelligenceProvider?: IntelligenceProvider,
  ) {}

  async evaluate(
    event: Event,
    state: UserState,
  ): Promise<Decision> {
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

    const intelligenceNeed = determineIntelligenceNeed(event)

    if (!intelligenceNeed.required) {
      return {
        action: "SILENCE",
        reason: intelligenceNeed.reason,
        eventId: event.id,
        source: "deterministic",
      }
    }

    if (!this.intelligenceProvider) {
      return {
        action: "WAIT",
        reason: "Intelligence is required but no provider is available",
        eventId: event.id,
        source: "deterministic",
      }
    }

    const recommendation = await this.intelligenceProvider.evaluate(
      event,
      state,
    )

    if (!validateRecommendation(recommendation)) {
      return {
        action: "SILENCE",
        reason: "Intelligence provider returned an invalid recommendation",
        eventId: event.id,
        source: "deterministic",
      }
    }

    return {
      action: recommendation.action,
      reason: recommendation.reason,
      eventId: event.id,
      source: "llm",
      recommendation,
    }
  }
}