import type { DecisionAction } from "@/engine/types"
import type { EventLifecycleState } from "@/lifecycle/types"

export function transitionFromDecision(
  state: EventLifecycleState,
  action: DecisionAction,
): EventLifecycleState {
  if (state !== "EVALUATING" && state !== "RE_EVALUATING") {
    throw new Error(
      `Decision cannot be applied from lifecycle state: ${state}`,
    )
  }

  switch (action) {
    case "SPEAK":
      return "INITIATED"

    case "WAIT":
      return "QUEUED"

    case "SILENCE":
      return "SILENCED"
  }
}

export function beginEvaluation(
  state: EventLifecycleState,
): EventLifecycleState {
  if (state !== "OBSERVED" && state !== "QUEUED") {
    throw new Error(
      `Evaluation cannot begin from lifecycle state: ${state}`,
    )
  }

  return state === "QUEUED"
    ? "RE_EVALUATING"
    : "EVALUATING"
}