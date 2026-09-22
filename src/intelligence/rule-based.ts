import type { Event } from "@/events/types"
import type { Recommendation } from "@/engine/types"
import type { IntelligenceProvider } from "@/intelligence/provider"
import type { UserState } from "@/state/types"
import type { EvaluationContext } from "@/intelligence/context"

export class RuleBasedIntelligenceProvider
  implements IntelligenceProvider
{
  async evaluate(
    event: Event,
    _state: UserState,
    context: EvaluationContext,
  ): Promise<Recommendation> {
    if (context.feedback.length > 0) {
      return {
        action: "SPEAK",
        reason: "Relevant feedback is available",
        evidence: [
          "Evaluation context contains relevant feedback",
        ],
        message:
          "This interaction is informed by previous feedback.",
      }
    }

    return {
      action: "SILENCE",
      reason: "No relevant feedback is available",
      evidence: [
        `Event type: ${event.type}`,
        "Evaluation context contains no feedback",
      ],
    }
  }
}