import type { Event } from "@/events/types"
import type { Recommendation } from "@/engine/types"
import type { UserState } from "@/state/types"
import type { EvaluationContext } from "@/intelligence/context"

export interface IntelligenceProvider {
  evaluate(
    event: Event,
    state: UserState,
    context: EvaluationContext,
  ): Promise<Recommendation>
}