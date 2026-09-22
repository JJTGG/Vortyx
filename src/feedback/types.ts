export type FeedbackEntry = {
  eventId: string
  data: Record<string, unknown>
  recordedAt: string
}

export interface FeedbackRecorder {
  record(entry: FeedbackEntry): void
}