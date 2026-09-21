export type DecisionAction = "SPEAK" | "WAIT" | "SILENCE"

export type DecisionSource = "deterministic" | "llm"

export type ReconsiderCondition =
  | {
      type: "time"
      at: string
    }
  | {
      type: "event"
      eventType: string
    }
  | {
      type: "state_change"
      field: string
    }
  | {
      type: "new_evidence"
      description: string
    }

export type Recommendation =
  | {
      action: "SPEAK"
      reason: string
      evidence: string[]
      message?: string
    }
  | {
      action: "WAIT"
      reason: string
      evidence: string[]
      reconsiderWhen: ReconsiderCondition
      expiresAt: string
    }
  | {
      action: "SILENCE"
      reason: string
      evidence: string[]
    }

export type Decision = {
  action: DecisionAction
  reason: string
  eventId: string
  source: DecisionSource
  recommendation?: Recommendation
}