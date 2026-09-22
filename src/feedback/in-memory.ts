import type {
  FeedbackEntry,
  FeedbackRecorder,
} from "@/feedback/types"

export class InMemoryFeedbackRecorder
  implements FeedbackRecorder
{
  private readonly entries: FeedbackEntry[] = []

  record(entry: FeedbackEntry): void {
    this.entries.push(entry)
  }

  getEntries(): FeedbackEntry[] {
    return [...this.entries]
  }

  clear(): void {
    this.entries.length = 0
  }
}