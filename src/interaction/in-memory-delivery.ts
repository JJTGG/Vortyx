import type { InteractionDelivery } from "@/interaction/delivery"
import type { InteractionRequest } from "@/interaction/types"

export class InMemoryInteractionDelivery
  implements InteractionDelivery
{
  private readonly requests: InteractionRequest[] = []

  async deliver(request: InteractionRequest): Promise<void> {
    this.requests.push(request)
  }

  getDelivered(): InteractionRequest[] {
    return [...this.requests]
  }

  clear(): void {
    this.requests.length = 0
  }
}