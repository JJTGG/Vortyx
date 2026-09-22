import { describe, expect, it, vi } from "vitest"
import type { Event } from "@/events/types"
import { ProactivityEngine } from "@/engine/engine"
import type { Recommendation } from "@/engine/types"
import { FakeIntelligenceProvider } from "@/intelligence/fake"
import { InMemoryInteractionDelivery } from "@/interaction/in-memory-delivery"
import { InMemoryDecisionLog } from "@/decision-log/in-memory"
import { reconsiderWait } from "@/application/reconsider-wait"
import type { UserState } from "@/state/types"

const state: UserState = {
  userId: "user-1",
  preferences: {
    proactiveEnabled: true,
  },
  recentEvents: [],
}

const event: Event = {
  id: "event-1",
  type: "external",
  timestamp: "2026-01-01T12:00:00.000Z",
  source: "test",
  data: {
    value: "new",
  },
}

const wait: Recommendation = {
  action: "WAIT",
  reason: "Need more evidence",
  evidence: ["Initial event was inconclusive"],
  reconsiderWhen: {
    type: "new_evidence",
    description: "New event data is available",
  },
  expiresAt: "2026-01-01T13:00:00.000Z",
}

describe("reconsiderWait lifecycle", () => {
  it("tracks KEEP_WAITING as QUEUED", async () => {
    const provider = {
      evaluate: vi.fn(),
    }

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()
    const log = new InMemoryDecisionLog()

    const result = await reconsiderWait(
      wait,
      {
        ...event,
        data: {},
      },
      state,
      engine,
      delivery,
      "2026-01-01T12:10:00.000Z",
      log,
    )

    expect(result.lifecycle).toBe("QUEUED")
    expect(result.decision.action).toBe("WAIT")
    expect(result.interaction).toBeNull()
    expect(provider.evaluate).not.toHaveBeenCalled()
    expect(log.getEntries()).toHaveLength(1)
  })

  it("tracks RECONSIDER as INITIATED", async () => {
    const provider = new FakeIntelligenceProvider()
    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()
    const log = new InMemoryDecisionLog()

    const result = await reconsiderWait(
      wait,
      event,
      state,
      engine,
      delivery,
      "2026-01-01T12:10:00.000Z",
      log,
    )

    expect(result.lifecycle).toBe("INITIATED")
    expect(result.decision.action).toBe("SPEAK")
    expect(result.interaction).not.toBeNull()
    expect(delivery.getDelivered()).toHaveLength(1)
    expect(log.getEntries()[0]?.source).toBe("llm")
  })

  it("tracks EXPIRED as SILENCED", async () => {
    const provider = {
      evaluate: vi.fn(),
    }

    const engine = new ProactivityEngine(provider)
    const delivery = new InMemoryInteractionDelivery()
    const log = new InMemoryDecisionLog()

    const result = await reconsiderWait(
      wait,
      event,
      state,
      engine,
      delivery,
      "2026-01-01T13:00:00.000Z",
      log,
    )

    expect(result.lifecycle).toBe("SILENCED")
    expect(result.decision.action).toBe("SILENCE")
    expect(result.interaction).toBeNull()
    expect(provider.evaluate).not.toHaveBeenCalled()
    expect(log.getEntries()[0]?.source).toBe("deterministic")
  })
})