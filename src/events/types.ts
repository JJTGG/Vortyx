export type Event = {
  id: string
  type: string
  timestamp: string
  source: string
  data: Record<string, unknown>
}