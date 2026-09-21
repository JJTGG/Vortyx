import type { ReconsiderCondition } from "@/engine/types"

export type WaitDecision = {
  action: "WAIT"
  reason: string
  reconsiderWhen: ReconsiderCondition
  expiresAt: string
}

export function createWaitDecision(
  reason: string,
  reconsiderWhen: ReconsiderCondition,
  expiresAt: string,
): WaitDecision {
  return {
    action: "WAIT",
    reason,
    reconsiderWhen,
    expiresAt,
  }
}