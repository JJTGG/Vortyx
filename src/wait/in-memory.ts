import type {
  WaitQueue,
  WaitQueueEntry,
  WaitQueueTrigger,
} from "@/wait/types"

export class InMemoryWaitQueue implements WaitQueue {
  private readonly entries: WaitQueueEntry[] = []

  enqueue(entry: WaitQueueEntry): void {
    this.entries.push(entry)
  }

  getDue(trigger: WaitQueueTrigger): WaitQueueEntry[] {
    const nowTime = Date.parse(trigger.now)

    if (Number.isNaN(nowTime)) {
      throw new Error(
        "Wait queue requires a valid current timestamp",
      )
    }

    return this.entries.filter((entry) => {
      if (entry.recommendation.action !== "WAIT") {
        return false
      }

      const recommendation = entry.recommendation

      const expiryTime = Date.parse(
        recommendation.expiresAt,
      )

      if (
        !Number.isNaN(expiryTime) &&
        expiryTime <= nowTime
      ) {
        return true
      }

      switch (recommendation.reconsiderWhen.type) {
        case "time": {
          const reconsiderTime = Date.parse(
            recommendation.reconsiderWhen.at,
          )

          return (
            !Number.isNaN(reconsiderTime) &&
            reconsiderTime <= nowTime
          )
        }

        case "event":
          return (
            trigger.event?.type ===
            recommendation.reconsiderWhen.eventType
          )

        case "state_change":
          return (
            trigger.event !== undefined &&
            Object.prototype.hasOwnProperty.call(
              trigger.event.data,
              recommendation.reconsiderWhen.field,
            )
          )

        case "new_evidence":
          return (
            trigger.event !== undefined &&
            Object.keys(trigger.event.data).length > 0
          )
      }
    })
  }

  remove(eventId: string): void {
    const index = this.entries.findIndex(
      (entry) => entry.event.id === eventId,
    )

    if (index !== -1) {
      this.entries.splice(index, 1)
    }
  }

  getAll(): WaitQueueEntry[] {
    return [...this.entries]
  }

  clear(): void {
    this.entries.length = 0
  }
}