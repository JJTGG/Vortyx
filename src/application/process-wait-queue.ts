import type { Event } from "@/events/types"
import type { ProactivityEngine } from "@/engine/engine"
import type { Decision } from "@/engine/types"
import type { EventLifecycleState } from "@/lifecycle/types"
import {
  beginEvaluation,
  transitionFromDecision,
} from "@/lifecycle/transition"
import type { InteractionDelivery } from "@/interaction/delivery"
import { executeInteraction } from "@/interaction/execute"
import type { InteractionRequest } from "@/interaction/types"
import type { InteractionHistory } from "@/interaction/history"
import type { DecisionLog } from "@/decision-log/types"
import type { WaitQueue } from "@/wait/types"
import type { UserState } from "@/state/types"

export type ProcessWaitQueueResult = {
  eventId: string
  decision: Decision
  interaction: InteractionRequest | null
  lifecycle: EventLifecycleState
}

export async function processWaitQueue(
  now: string,
  state: UserState,
  engine: ProactivityEngine,
  queue: WaitQueue,
  delivery: InteractionDelivery,
  decisionLog?: DecisionLog,
  interactionHistory?: InteractionHistory,
  triggerEvent?: Event,
): Promise<ProcessWaitQueueResult[]> {
  const dueEntries = queue.getDue({
    now,
    event: triggerEvent,
  })
  const results: ProcessWaitQueueResult[] = []

  for (const entry of dueEntries) {
    const evaluatingState = beginEvaluation("QUEUED")

    const decision = await engine.evaluateReconsideredWait(
      entry.recommendation,
      entry.event,
      state,
      now,
    )

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
      recordedAt: now,
    })

    queue.remove(entry.event.id)

    if (
      decision.action === "WAIT" &&
      decision.recommendation?.action === "WAIT"
    ) {
      queue.enqueue({
        event: entry.event,
        recommendation: decision.recommendation,
        queuedAt: now,
      })
    }

    const interaction = await executeInteraction(
      decision,
      delivery,
    )

    if (interaction !== null) {
      interactionHistory?.record({
        ...interaction,
        initiatedAt: now,
      })
    }

    results.push({
      eventId: entry.event.id,
      decision,
      interaction,
      lifecycle,
    })
  }

  return results
}