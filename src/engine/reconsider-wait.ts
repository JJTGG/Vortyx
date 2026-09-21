import type { Event } from "@/events/types"
import type { Recommendation } from "@/engine/types"
import { shouldReconsider } from "@/engine/reconsider"

export type WaitReconsideration =
  | {
      action: "RECONSIDER"
      reason: string
    }
  | {
      action: "KEEP_WAITING"
      reason: string
    }
  | {
      action: "EXPIRED"
      reason: string
    }

export function reconsiderWait(
  wait: Recommendation,
  event: Event,
  now: string,
): WaitReconsideration {
  if (wait.action !== "WAIT") {
    return {
      action: "EXPIRED",
      reason: "Only WAIT recommendations can be reconsidered",
    }
  }

  const nowTime = Date.parse(now)
  const expiryTime = Date.parse(wait.expiresAt)

  if (
    Number.isNaN(nowTime) ||
    Number.isNaN(expiryTime)
  ) {
    return {
      action: "EXPIRED",
      reason: "WAIT contains an invalid time boundary",
    }
  }

  if (nowTime >= expiryTime) {
    return {
      action: "EXPIRED",
      reason: "WAIT has expired",
    }
  }

  if (
    shouldReconsider(
      wait.reconsiderWhen,
      event,
      now,
    )
  ) {
    return {
      action: "RECONSIDER",
      reason: "WAIT reconsideration condition was met",
    }
  }

  return {
    action: "KEEP_WAITING",
    reason: "WAIT reconsideration condition has not been met",
  }
}