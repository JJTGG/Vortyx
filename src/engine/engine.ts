import type { Event } from "@/events/types"
import type { Decision, Recommendation } from "@/engine/types"
import { determineIntelligenceNeed } from "@/engine/intelligence-gate"
import { reconsiderWait } from "@/engine/reconsider-wait"
import { validateRecommendation } from "@/engine/validate-recommendation"
import { createWaitRecommendation } from "@/engine/wait"
import { isWithinProactiveCooldown } from "@/engine/cooldown"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type { EvaluationContext } from "@/intelligence/context"
import { RuleBasedIntelligenceProvider } from "@/intelligence/rule-based"
import type { FeedbackQuery } from "@/feedback/query"
import { getFeedbackContext } from "@/feedback/context"
import type { InteractionHistory } from "@/interaction/history"
import type { UserState } from "@/state/types"

const WAIT_RECONSIDER_DELAY_MS = 5 * 60 * 1000
const WAIT_EXPIRY_DELAY_MS = 60 * 60 * 1000

function areEventDataEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function createBoundedWait(
  event: Event,
  reason: string,
  decisionEventId = event.id,
): Decision {
  const eventTime = Date.parse(event.timestamp)

  if (Number.isNaN(eventTime)) {
    return {
      action: "SILENCE",
      reason: "Cannot create bounded WAIT from an invalid event timestamp",
      eventId: decisionEventId,
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
    eventId: decisionEventId,
    source: "deterministic",
    recommendation,
  }
}

export class ProactivityEngine {
  private readonly intelligenceProvider: IntelligenceProvider
  private readonly feedbackQuery?: FeedbackQuery
  private readonly interactionHistory?: InteractionHistory

  constructor(
    intelligenceProvider?: IntelligenceProvider,
    feedbackQuery?: FeedbackQuery,
    interactionHistory?: InteractionHistory,
  ) {
    this.intelligenceProvider =
      intelligenceProvider ??
      new RuleBasedIntelligenceProvider()

    this.feedbackQuery = feedbackQuery
    this.interactionHistory = interactionHistory
  }

  private buildEvaluationContext(
    eventId: string,
  ): EvaluationContext {
    if (!this.feedbackQuery) {
      return {
        feedback: [],
      }
    }

    return {
      feedback: getFeedbackContext(
        eventId,
        this.feedbackQuery,
      ),
    }
  }

  private async evaluateEvent(
    event: Event,
    state: UserState,
    checkDuplicates: boolean,
    decisionEventId = event.id,
  ): Promise<Decision> {
    if (!state.preferences.proactiveEnabled) {
      return {
        action: "SILENCE",
        reason: "Proactive interactions are disabled",
        eventId: decisionEventId,
        source: "deterministic",
      }
    }

    if (checkDuplicates) {
      const duplicate = state.recentEvents.some(
        (recentEvent) =>
          recentEvent.type === event.type &&
          recentEvent.source === event.source &&
          areEventDataEqual(
            recentEvent.data,
            event.data,
          ),
      )

      if (duplicate) {
        return {
          action: "SILENCE",
          reason: "Duplicate event detected",
          eventId: decisionEventId,
          source: "deterministic",
        }
      }
    }

    if (
      this.interactionHistory &&
      isWithinProactiveCooldown(
        event.timestamp,
        this.interactionHistory,
      )
    ) {
      return {
        action: "SILENCE",
        reason: "Proactive interaction cooldown is active",
        eventId: decisionEventId,
        source: "deterministic",
      }
    }

    const intelligenceNeed = determineIntelligenceNeed(event)

    if (!intelligenceNeed.required) {
      return {
        action: "SILENCE",
        reason: intelligenceNeed.reason,
        eventId: decisionEventId,
        source: "deterministic",
      }
    }

    const context = this.buildEvaluationContext(
      decisionEventId,
    )

    let recommendation: Recommendation

    try {
      recommendation = await this.intelligenceProvider.evaluate(
        event,
        state,
        context,
      )
    } catch {
      return createBoundedWait(
        event,
        "Intelligence provider failed",
        decisionEventId,
      )
    }

    if (!validateRecommendation(recommendation)) {
      return {
        action: "SILENCE",
        reason: "Intelligence provider returned an invalid recommendation",
        eventId: decisionEventId,
        source: "deterministic",
      }
    }

    return {
      action: recommendation.action,
      reason: recommendation.reason,
      eventId: decisionEventId,
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
    decisionEventId = event.id,
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
          eventId: decisionEventId,
          source: "deterministic",
          recommendation: wait,
        }

      case "EXPIRED":
        return {
          action: "SILENCE",
          reason: reconsideration.reason,
          eventId: decisionEventId,
          source: "deterministic",
        }

      case "RECONSIDER":
        return this.evaluateEvent(
          event,
          state,
          false,
          decisionEventId,
        )
    }
  }
}