import type { Recommendation } from "@/engine/types"
import type { Event } from "@/events/types"

export type WaitQueueEntry = {
  event: Event
  recommendation: Recommendation
  queuedAt: string
}

export interface WaitQueue {
  enqueue(entry: WaitQueueEntry): void
  getDue(now: string): WaitQueueEntry[]
  remove(eventId: string): void
  getAll(): WaitQueueEntry[]
}