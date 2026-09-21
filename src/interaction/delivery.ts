import type { InteractionRequest } from "@/interaction/types"

export interface InteractionDelivery {
  deliver(request: InteractionRequest): Promise<void>
}