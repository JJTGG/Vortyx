import type { Event } from "@/events/types"
import type { Recommendation } from "@/engine/types"
import type { UserState } from "@/state/types"

export interface IntelligenceProvider {
  evaluate(
    event: Event,
    state: UserState,
  ): Promise<Recommendation>
}