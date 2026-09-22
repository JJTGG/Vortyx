import type {
  DecisionLog,
  DecisionLogEntry,
} from "@/decision-log/types"

export class InMemoryDecisionLog implements DecisionLog {
  private readonly entries: DecisionLogEntry[] = []

  record(entry: DecisionLogEntry): void {
    this.entries.push(entry)
  }

  getEntries(): DecisionLogEntry[] {
    return [...this.entries]
  }

  clear(): void {
    this.entries.length = 0
  }
}