import type {
  Recommendation,
  ReconsiderCondition,
} from "@/engine/types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  )
}

function isValidReconsiderCondition(
  value: unknown,
): value is ReconsiderCondition {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false
  }

  switch (value.type) {
    case "time":
      return (
        isNonEmptyString(value.at) &&
        !Number.isNaN(Date.parse(value.at))
      )

    case "event":
      return isNonEmptyString(value.eventType)

    case "state_change":
      return isNonEmptyString(value.field)

    case "new_evidence":
      return isNonEmptyString(value.description)

    default:
      return false
  }
}

export function validateRecommendation(
  value: unknown,
): value is Recommendation {
  if (!isRecord(value)) {
    return false
  }

  if (
    value.action !== "SPEAK" &&
    value.action !== "WAIT" &&
    value.action !== "SILENCE"
  ) {
    return false
  }

  if (!isNonEmptyString(value.reason)) {
    return false
  }

  if (!isStringArray(value.evidence)) {
    return false
  }

  if (value.action === "WAIT") {
    if (!isValidReconsiderCondition(value.reconsiderWhen)) {
      return false
    }

    if (
      value.expiresAt !== undefined &&
      (typeof value.expiresAt !== "string" ||
        Number.isNaN(Date.parse(value.expiresAt)))
    ) {
      return false
    }
  }

  if (
    value.action === "SPEAK" &&
    value.message !== undefined &&
    typeof value.message !== "string"
  ) {
    return false
  }

  return true
}