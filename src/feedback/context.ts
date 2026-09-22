import type { FeedbackEntry } from "@/feedback/types"
import type { FeedbackQuery } from "@/feedback/query"

export function getFeedbackContext(
  eventId: string,
  feedbackQuery: FeedbackQuery,
): FeedbackEntry[] {
  return feedbackQuery.getByEventId(eventId)
}