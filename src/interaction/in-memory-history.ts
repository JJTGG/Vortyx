import type {
  InteractionHistory,
  InteractionHistoryEntry,
} from "@/interaction/history"

export class InMemoryInteractionHistory
  implements InteractionHistory
{
  private readonly entries: InteractionHistoryEntry[] = []

  record(entry: InteractionHistoryEntry): void {
    this.entries.push(entry)
  }

  getRecent(limit: number): InteractionHistoryEntry[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error(
        "Interaction history limit must be a non-negative integer",
      )
    }

    return this.entries.slice(-limit).reverse()
  }

  clear(): void {
    this.entries.length = 0
  }
}