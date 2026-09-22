import {
  transitionFromInitiated,
  transitionToFeedback,
} from "@/lifecycle/transition"
import type { EventLifecycleState } from "@/lifecycle/types"
import type {
  FeedbackEntry,
  FeedbackRecorder,
} from "@/feedback/types"
import { recordFeedback } from "@/application/record-feedback"

export type InteractionOutcome =
  | "USER_RESPONDED"
  | "IGNORED"

export type InteractionOutcomeResult = {
  lifecycle: EventLifecycleState
}

export function recordInteractionOutcome(
  state: EventLifecycleState,
  outcome: InteractionOutcome,
): InteractionOutcomeResult {
  const outcomeState = transitionFromInitiated(
    state,
    outcome,
  )

  return {
    lifecycle: transitionToFeedback(outcomeState),
  }
}

export function recordInteractionOutcomeAndFeedback(
  state: EventLifecycleState,
  outcome: InteractionOutcome,
  eventId: string,
  feedback: Record<string, unknown>,
  recorder: FeedbackRecorder,
  recordedAt: string,
): {
  lifecycle: EventLifecycleState
  feedback: FeedbackEntry
} {
  const outcomeResult = recordInteractionOutcome(
    state,
    outcome,
  )

  const feedbackEntry = recordFeedback(
    outcomeResult.lifecycle,
    eventId,
    feedback,
    recorder,
    recordedAt,
  )

  return {
    lifecycle: outcomeResult.lifecycle,
    feedback: feedbackEntry,
  }
}