import type {
  WaitQueue,
  WaitQueueEntry,
} from "@/wait/types"

export class InMemoryWaitQueue implements WaitQueue {
  private readonly entries: WaitQueueEntry[] = []

  enqueue(entry: WaitQueueEntry): void {
    this.entries.push(entry)
  }

  getDue(now: string): WaitQueueEntry[] {
    const nowTime = Date.parse(now)

    if (Number.isNaN(nowTime)) {
      throw new Error("Wait queue requires a valid current timestamp")
    }

    return this.entries.filter((entry) => {
      const reconsiderAt =
        entry.recommendation.action === "WAIT"
          ? entry.recommendation.reconsiderWhen
          : null

      if (
        !reconsiderAt ||
        reconsiderAt.type !== "time"
      ) {
        return false
      }

      const reconsiderTime = Date.parse(
        reconsiderAt.at,
      )

      if (Number.isNaN(reconsiderTime)) {
        return false
      }

      return reconsiderTime <= nowTime
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