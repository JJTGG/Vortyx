import type { Event } from "@/events/types"
import type { Decision, Recommendation } from "@/engine/types"
import { determineIntelligenceNeed } from "@/engine/intelligence-gate"
import { reconsiderWait } from "@/engine/reconsider-wait"
import { validateRecommendation } from "@/engine/validate-recommendation"
import { createWaitRecommendation } from "@/engine/wait"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type { UserState } from "@/state/types"

const WAIT_RECONSIDER_DELAY_MS = 5 * 60 * 1000
const WAIT_EXPIRY_DELAY_MS = 60 * 60 * 1000

function createBoundedWait(
  event: Event,
  reason: string,
): Decision {
  const eventTime = Date.parse(event.timestamp)

  if (Number.isNaN(eventTime)) {
    return {
      action: "SILENCE",
      reason: "Cannot create bounded WAIT from an invalid event timestamp",
      eventId: event.id,
      source: "deterministic",
    }
  }

  const reconsiderAt = new Date(
    eventTime + WAIT_RECONSIDER_DELAY_MS,
  ).toISOString()

  const expiresAt = new Date(
    eventTime + WAIT_EXPIRY_DELAY_MS,
  ).toISOString()

  const recommendation = createWaitRecommendation(
    reason,
    {
      type: "time",
      at: reconsiderAt,
    },
    expiresAt,
  )

  return {
    action: "WAIT",
    reason,
    eventId: event.id,
    source: "deterministic",
    recommendation,
  }
}

export class ProactivityEngine {
  constructor(
    private readonly intelligenceProvider?: IntelligenceProvider,
  ) {}

  private async evaluateEvent(
    event: Event,
    state: UserState,
    checkDuplicates: boolean,
  ): Promise<Decision> {
    if (!state.preferences.proactiveEnabled) {
      return {
        action: "SILENCE",
        reason: "Proactive interactions are disabled",
        eventId: event.id,
        source: "deterministic",
      }
    }

    if (checkDuplicates) {
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
      return createBoundedWait(
        event,
        "Intelligence is required but no provider is available",
      )
    }

    let recommendation: Recommendation

    try {
      recommendation = await this.intelligenceProvider.evaluate(
        event,
        state,
      )
    } catch {
      return createBoundedWait(
        event,
        "Intelligence provider failed",
      )
    }

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

  async evaluate(
    event: Event,
    state: UserState,
  ): Promise<Decision> {
    return this.evaluateEvent(event, state, true)
  }

  async evaluateReconsideredWait(
    wait: Recommendation,
    event: Event,
    state: UserState,
    now: string,
  ): Promise<Decision> {
    const reconsideration = reconsiderWait(
      wait,
      event,
      now,
    )

    switch (reconsideration.action) {
      case "KEEP_WAITING":
        return {
          action: "WAIT",
          reason: reconsideration.reason,
          eventId: event.id,
          source: "deterministic",
          recommendation: wait,
        }

      case "EXPIRED":
        return {
          action: "SILENCE",
          reason: reconsideration.reason,
          eventId: event.id,
          source: "deterministic",
        }

      case "RECONSIDER":
        return this.evaluateEvent(
          event,
          state,
          false,
        )
    }
  }
}