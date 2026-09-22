import type { InteractionHistory } from "@/interaction/history"

export const PROACTIVE_COOLDOWN_MS = 30 * 60 * 1000

export function isWithinProactiveCooldown(
  eventTimestamp: string,
  history: InteractionHistory,
): boolean {
  const eventTime = Date.parse(eventTimestamp)

  if (Number.isNaN(eventTime)) {
    return false
  }

  const recentInteraction = history.getRecent(1)[0]

  if (!recentInteraction) {
    return false
  }

  const interactionTime = Date.parse(
    recentInteraction.initiatedAt,
  )

  if (Number.isNaN(interactionTime)) {
    return false
  }

  return (
    eventTime - interactionTime >= 0 &&
    eventTime - interactionTime < PROACTIVE_COOLDOWN_MS
  )
}