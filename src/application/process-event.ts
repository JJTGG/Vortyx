import type { Event } from "@/events/types"
import type { ProactivityEngine } from "@/engine/engine"
import type { InteractionDelivery } from "@/interaction/delivery"
import { executeInteraction } from "@/interaction/execute"
import type { InteractionRequest } from "@/interaction/types"
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
): Promise<ProcessEventResult> {
  const decision = await engine.evaluate(event, state)

  const interaction = await executeInteraction(
    decision,
    delivery,
  )

  return {
    decision,
    interaction,
  }
}