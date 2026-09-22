import type { Recommendation } from "@/engine/types"
import type { Event } from "@/events/types"

export type WaitQueueEntry = {
  event: Event
  recommendation: Recommendation
  queuedAt: string
}

export type WaitQueueTrigger = {
  now: string
  event?: Event
}

export interface WaitQueue {
  enqueue(entry: WaitQueueEntry): void
  getDue(trigger: WaitQueueTrigger): WaitQueueEntry[]
  remove(eventId: string): void
  getAll(): WaitQueueEntry[]
}