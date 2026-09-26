  it("evaluates a rapid sequence of distinct signals independently", async () => {
    let calls = 0

    const provider: IntelligenceProvider = {
      async evaluate(
        event: Event,
      ): Promise<Recommendation> {
        calls += 1

        expect(event.data).toEqual({
          value: calls,
        })

        return {
          action: "SPEAK",
          reason: "Distinct signal received",
          evidence: ["Signal contains a new value"],
          message: `Signal ${calls} received.`,
        }
      },
    }

    const events: Event[] = Array.from(
      { length: 10 },
      (_, index) => ({
        id: `flood-event-${index + 1}`,
        type: "user_signal",
        timestamp: `2026-01-01T10:00:00.${String(
          index,
        ).padStart(3, "0")}Z`,
        source: "sensor",
        data: {
          value: index + 1,
        },
      }),
    )

    const engine = new ProactivityEngine(provider)

    for (let index = 0; index < events.length; index += 1) {
      const decision = await engine.evaluate(
        events[index],
        {
          ...baseState,
          recentEvents: events.slice(0, index),
        },
      )

      expect(decision.action).toBe("SPEAK")
      expect(decision.eventId).toBe(events[index].id)
    }

    expect(calls).toBe(10)
  })