import type { Event } from "@/events/types"
import type { ProactivityEngine } from "@/engine/engine"
import type { Recommendation } from "@/engine/types"
import type { InteractionDelivery } from "@/interaction/delivery"
import { executeInteraction } from "@/interaction/execute"
import type { InteractionRequest } from "@/interaction/types"
import type { DecisionLog } from "@/decision-log/types"
import type { UserState } from "@/state/types"

export type ReconsiderWaitResult = {
  decision: Awaited<
    ReturnType<ProactivityEngine["evaluateReconsideredWait"]>
  >
  interaction: InteractionRequest | null
}

export async function reconsiderWait(
  wait: Recommendation,
  event: Event,
  state: UserState,
  engine: ProactivityEngine,
  delivery: InteractionDelivery,
  now: string,
  decisionLog?: DecisionLog,
): Promise<ReconsiderWaitResult> {
  const decision = await engine.evaluateReconsideredWait(
    wait,
    event,
    state,
    now,
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

  return {
    decision,
    interaction,
  }
}