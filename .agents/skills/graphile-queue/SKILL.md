---
name: graphile-queue
description: >
  Documentation and guidelines for implementing and enqueuing background tasks using graphile-worker in the Ferrite repository.
  Use this skill when creating new background processors, enqueuing jobs, or working with the EventPayload envelope.
  Trigger for "queue", "graphile", "processor", "background job", "worker".
---

# Graphile Queue Architecture

This skill defines conventions for background processing in the Ferrite core application, which leverages `graphile-worker` built on Postgres.

## 1. Processors (Consumers)

Processors consume jobs from a specific queue. 

- **Base Class:** All processors must extend `BaseProcessor<EventPayload>` (from `@core/processor`).
- **Decorator:** Decorate the class with `@GraphileProcessor('queue-name-here')` using a globally unique queue name constant.
- **Handling:** Implement `protected async handle(payload: EventPayload, helpers?: JobHelpers): Promise<Result<void, Error>>`.
- **Validation:** Always validate the `payload.payload` (the inner payload) against your domain-specific Zod schema inside the `handle` method. If validation fails, log a "Poison Pill" error and return `ok()` so graphile deletes the bad job rather than infinitely retrying it.
- **Tracing:** Wrap the use case invocation in `this.tracer.withSpan(...)`.

**Example:**
```typescript
@GraphileProcessor(MY_QUEUE_NAME)
export class MyFeatureProcessor extends BaseProcessor<EventPayload> {
    constructor(
        protected readonly logger: AppLogger,
        @Inject(MY_USE_CASE_UC) private readonly uc: IMyUseCase,
        @Inject(OTEL_TRACER) private readonly tracer: ITracer
    ) {
        super(logger);
    }

    protected async handle(envelope: EventPayload): Promise<Result<void, Error>> {
        return this.tracer.withSpan('MyFeatureProcessor.handle', async () => {
            const parsed = MyPayloadSchema.safeParse(envelope.payload);
            if (!parsed.success) return ok(); // Ack poison pill

            return this.uc.execute(parsed.data);
        });
    }
}
```

## 2. Enqueuing Jobs (Producers)

Jobs must be enqueued transactionally, typically via the Transactional Outbox pattern alongside database mutations.

- **Injection:** Inject `@Inject(ENQUEUE_GRAPHILE_EVENT_UC) private readonly enqueue: IEnqueue` (from `@modules/queue`).
- **Execution:** Call `this.enqueue.execute(tx, queueParams)` inside the Unit of Work (`tx`).
- **Params:** Provide `identifier` (queue name), `maxAttempts`, `eventId` (UUID), `eventType`, and the domain-specific `payload`.

**Example:**
```typescript
await this.enqueue.execute(tx, {
    identifier: MY_QUEUE_NAME,
    maxAttempts: 5,
    eventId: crypto.randomUUID(),
    eventType: 'feature.action',
    payload: {
        someId: data.id,
    },
});
```

## 3. Module Wiring

- **Producer side:** Any module that enqueues jobs must import `QueueModule`.
- **Consumer side:** Any module that provides `@GraphileProcessor` classes must import `ProcessorModule` (and provide the processor class in the `providers` array).
