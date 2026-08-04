---
name: zod-schemas
description: >
  Guidance for writing Zod schemas in the Ferrite repository. Use this skill when 
  creating, editing, or managing Zod schemas for models, API payloads, or configuration. 
  Trigger for "zod", "schema", "validation", "payload", "input validation".
---

# Zod Schemas

This skill guides how to properly define and manage Zod schemas across the monorepo.

## 1. Import Rules
- **Crucial Rule:** You must ALWAYS import Zod from `zod/v4`. 
- **Example:** `import { z } from 'zod/v4';`
- Do NOT import from `zod` directly.

## 2. Location & Packages
- All domain schemas, input validation schemas, and types inferred from schemas must be placed within the `@ferrite/schema` package located at `packages/schema/*`.
- Do NOT place `.zodschema.ts` files inside application folders like `apps/core/src/modules/`. Keep the application layer clean; it should import schemas from the `@ferrite/schema` package.

## 3. Build Process
- Before building the main applications (like `apps/core`), you **must** build the schema package if you made any changes to the schemas.
- Run the build script in `packages/schema` so that the generated typings are available to the rest of the workspace.
