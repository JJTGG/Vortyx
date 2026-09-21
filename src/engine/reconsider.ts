import type { Event } from "@/events/types"
import type { ReconsiderCondition } from "@/engine/types"

export function shouldReconsider(
  condition: ReconsiderCondition,
  event: Event,
  now: string,
): boolean {
  switch (condition.type) {
    case "time":
      return !Number.isNaN(Date.parse(now)) &&
        !Number.isNaN(Date.parse(condition.at)) &&
        Date.parse(now) >= Date.parse(condition.at)

    case "event":
      return event.type === condition.eventType

    case "state_change":
      return Object.prototype.hasOwnProperty.call(
        event.data,
        condition.field,
      )

    case "new_evidence":
      return Object.keys(event.data).length > 0
  }
}