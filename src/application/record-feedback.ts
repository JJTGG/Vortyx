import type { EventLifecycleState } from "@/lifecycle/types"
import type {
  FeedbackEntry,
  FeedbackRecorder,
} from "@/feedback/types"

export function recordFeedback(
  state: EventLifecycleState,
  eventId: string,
  data: Record<string, unknown>,
  recorder: FeedbackRecorder,
  recordedAt: string,
): FeedbackEntry {
  if (state !== "FEEDBACK") {
    throw new Error(
      `Feedback cannot be recorded from lifecycle state: ${state}`,
    )
  }

  const entry: FeedbackEntry = {
    eventId,
    data,
    recordedAt,
  }

  recorder.record(entry)

  return entry
}