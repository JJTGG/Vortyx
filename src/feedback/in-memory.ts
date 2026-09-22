import type {
  FeedbackEntry,
  FeedbackRecorder,
} from "@/feedback/types"
import type { FeedbackQuery } from "@/feedback/query"

export class InMemoryFeedbackRecorder
  implements FeedbackRecorder, FeedbackQuery
{
  private readonly entries: FeedbackEntry[] = []

  record(entry: FeedbackEntry): void {
    this.entries.push(entry)
  }

  getEntries(): FeedbackEntry[] {
    return [...this.entries]
  }

  getByEventId(eventId: string): FeedbackEntry[] {
    return this.entries.filter(
      (entry) => entry.eventId === eventId,
    )
  }

  getRecent(limit: number): FeedbackEntry[] {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error(
        "Feedback limit must be a non-negative integer",
      )
    }

    return this.entries.slice(-limit).reverse()
  }

  clear(): void {
    this.entries.length = 0
  }
}