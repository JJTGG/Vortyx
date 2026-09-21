import type { Event } from "@/events/types"

export type UserState = {
  userId: string
  preferences: {
    proactiveEnabled: boolean
  }
  recentEvents: Event[]
}