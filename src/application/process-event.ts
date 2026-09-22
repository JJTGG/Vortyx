import type { Event } from "@/events/types"
import type { ProactivityEngine } from "@/engine/engine"
import type { InteractionDelivery } from "@/interaction/delivery"
import { executeInteraction } from "@/interaction/execute"
import type { InteractionRequest } from "@/interaction/types"
import type { DecisionLog } from "@/decision-log/types"
import type { UserState } from "@/state/types"

export type ProcessEventResult = {
  decision: Awaited<ReturnType<ProactivityEngine["evaluate"]>>
  interaction: InteractionRequest | null
}

export async function processEvent(
  event: Event,
  state: UserState,
  engine: ProactivityEngine,
  delivery: InteractionDelivery,
  decisionLog?: DecisionLog,
): Promise<ProcessEventResult> {
  const decision = await engine.evaluate(event, state)

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

  return {
    decision,
    interaction,
  }
}