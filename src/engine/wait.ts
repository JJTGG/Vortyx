import type {
  Recommendation,
  ReconsiderCondition,
} from "@/engine/types"

export function createWaitRecommendation(
  reason: string,
  reconsiderWhen: ReconsiderCondition,
  expiresAt: string,
): Recommendation {
  return {
    action: "WAIT",
    reason,
    evidence: [],
    reconsiderWhen,
    expiresAt,
  }
}