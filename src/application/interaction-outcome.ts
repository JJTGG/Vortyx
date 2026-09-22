import {
  transitionFromInitiated,
  transitionToFeedback,
} from "@/lifecycle/transition"
import type { EventLifecycleState } from "@/lifecycle/types"

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