import type { InteractionRequest } from "@/interaction/types"

export type InteractionHistoryEntry = InteractionRequest & {
  initiatedAt: string
}

export interface InteractionHistory {
  record(entry: InteractionHistoryEntry): void
  getRecent(limit: number): InteractionHistoryEntry[]
}