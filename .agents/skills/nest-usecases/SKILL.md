---
name: nest-usecases
description: >
  Guidance for writing Application Use Cases in the Ferrite repository. Use this skill 
  when writing, debugging, or reviewing use cases that orchestrate business logic. 
  Trigger for "usecase", "use case", "orchestration", "tracing", "debug logging", "execute() method".
---

# Application Use Cases

This skill guides the implementation of use cases within the Hexagonal Architecture application layer.

## 1. Implementation & Execution
- **Interface:** Every use case class must implement the `IUseCase<TInput, TOutput, TError>` interface.
- **Method:** It must expose a single public `async execute(input: TInput): Promise<Result<TOutput, TError>>` method.
- **Return Type:** Always return a `Result` object (using `ok()` for success and `err()` for failure). Never throw exceptions for expected, predictable failures.

## 2. Observability: Tracing & Logging
- **Tracing:** You MUST trace the execution of the use case. Wrap the core logic inside a trace span using OpenTelemetry.
  - Inject the tracer: `@Inject(OTEL_TRACER) private readonly tracer: ITracer`.
  - Wrap logic: `return this.tracer.withSpan('use-case.module.operation', async () => { ... });`
- **Debug Logging:** Use cases must support debug logging to aid in troubleshooting without cluttering standard output.
  - Inject the AppLogger: `private readonly logger: AppLogger`.
  - Set context in constructor: `this.logger.setContext(this.constructor.name);`.
  - **Rule:** Log information ONLY when needed using `this.logger.debug(...)`. Do not spam standard `.info` logs. Log inputs, critical steps, and failure reasons.
  - **SECURITY/PII Rule:** NEVER leak sensitive information that can be used to identify individuals (PII) such as emails, phone numbers, raw passwords, or full names in logs or trace spans. If you must log a user context, use their opaque ID.

## 3. Boilerplate Template
- **INSTRUCTION:** When creating a new use case, DO NOT write it from scratch. Instead, copy the template provided in `.agents/skills/nest-usecases/usecase.ts.template`.
- **Example Command:** `cp .agents/skills/nest-usecases/usecase.ts.template apps/core/src/modules/my-module/application/use-cases/my-usecase.ts`
- Use the `@/` path alias or defined `tsconfig.json` aliases to import common modules.
