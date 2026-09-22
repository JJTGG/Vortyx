import type { Recommendation } from "@/engine/types"

export type DecisionLogEntry = {
  eventId: string
  action: "SPEAK" | "WAIT" | "SILENCE"
  source: "deterministic" | "llm"
  reason: string
  recommendation?: Recommendation
  recordedAt: string
}

export interface DecisionLog {
  record(entry: DecisionLogEntry): void
}