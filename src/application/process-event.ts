import type { Event } from "@/events/types"
import type { ProactivityEngine } from "@/engine/engine"
import {
  beginEvaluation,
  transitionFromDecision,
} from "@/lifecycle/transition"
import type { EventLifecycleState } from "@/lifecycle/types"
import type { InteractionDelivery } from "@/interaction/delivery"
import { executeInteraction } from "@/interaction/execute"
import type { InteractionRequest } from "@/interaction/types"
import type { InteractionHistory } from "@/interaction/history"
import type { DecisionLog } from "@/decision-log/types"
import type { UserState } from "@/state/types"

export type ProcessEventResult = {
  decision: Awaited<ReturnType<ProactivityEngine["evaluate"]>>
  interaction: InteractionRequest | null
  lifecycle: EventLifecycleState
}

export async function processEvent(
  event: Event,
  state: UserState,
  engine: ProactivityEngine,
  delivery: InteractionDelivery,
  decisionLog?: DecisionLog,
  interactionHistory?: InteractionHistory,
): Promise<ProcessEventResult> {
  const observedState: EventLifecycleState = "OBSERVED"

  const evaluatingState = beginEvaluation(observedState)

  const decision = await engine.evaluate(event, state)

  const lifecycle = transitionFromDecision(
    evaluatingState,
    decision.action,
  )

  decisionLog?.record({
    eventId: decision.eventId,
    action: decision.action,
    source: decision.source,
    reason: decision.reason,
    recommendation: decision.recommendation,
    recordedAt: new Date().toISOString(),
  })

  const interaction = await executeInteraction(
    decision,
    delivery,
  )

  if (interaction !== null) {
    interactionHistory?.record({
      ...interaction,
      initiatedAt: event.timestamp,
    })
  }

  return {
    decision,
    interaction,
    lifecycle,
  }
}