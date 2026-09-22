import type { FeedbackEntry } from "@/feedback/types"

export interface FeedbackQuery {
  getByEventId(eventId: string): FeedbackEntry[]
  getRecent(limit: number): FeedbackEntry[]
}