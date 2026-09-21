import type { Event } from "@/events/types"
import type { Recommendation } from "@/engine/types"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type { UserState } from "@/state/types"

export class FakeIntelligenceProvider implements IntelligenceProvider {
  async evaluate(
    event: Event,
    _state: UserState,
  ): Promise<Recommendation> {
    return {
      action: "SPEAK",
      reason: "Fake provider recommends an interaction",
      evidence: [`Event type: ${event.type}`],
      message: "This is a test proactive message.",
    }
  }
}