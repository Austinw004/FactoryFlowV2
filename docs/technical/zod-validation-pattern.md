# Zod Validation Pattern

Prescient Labs uses **Zod** as the single source of truth for request-body
validation. Incoming user input never bypasses a schema: every route either
uses `insertXxxSchema.parse()` derived from the Drizzle table definition or
uses a purpose-built schema via the `validateBody()` middleware.

## Why Zod
- **Same schema runtime and compile time.** Zod types flow into TypeScript
  automatically so handlers see validated, typed values.
- **Explicit failure mode.** Validation failures produce a single 400 response
  with a stable shape the client can render:
  ```json
  { "error": "Validation failed", "fields": { "email": "Invalid email" } }
  ```
- **Composability.** Schemas compose via `.extend`, `.merge`, `.pick`, `.omit`
  so a PATCH schema is trivially derived from a POST schema.

## Middleware

`server/middleware/validateBody.ts` exposes three helpers:

```ts
validateBody(schema)   // validates req.body, sets req.validated
validateQuery(schema)  // validates req.query
getValidated(req)      // typed getter for handler code
```

## Reference route

```ts
import { z } from "zod";
import { validateBody } from "../middleware/validateBody";

const updateCompanySchema = z.object({
  name: z.string().trim().min(1).max(256),
  industry: z.string().trim().max(128).nullable().optional(),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]).nullable().optional(),
  location: z.string().trim().max(256).nullable().optional(),
});

app.post(
  "/api/onboarding/company",
  isAuthenticated,
  validateBody(updateCompanySchema),
  async (req: any, res) => {
    const body = req.validated as z.infer<typeof updateCompanySchema>;
    // body.name is trimmed + non-empty, industry is safe.
    ...
  },
);
```

## Rollout plan

As of this writing, Zod is the standard for:

- All authentication routes (`signup`, `login`, `forgot-password`, `reset-password`).
- All payment / Stripe webhook routes.
- The traceability verification endpoint.
- Automation rule creation + update.

The remaining `req.body` destructure sites (~400) are being retrofitted
opportunistically — every time a handler is touched for another reason, its
body schema is added. This avoids a giant one-shot PR that would be hard to
review and high-regression-risk. Progress is tracked in
`docs/ZOD_COVERAGE.md` (to be regenerated from route introspection as part of
the planned CI pass).

## CI enforcement (planned)

A future `server/scripts/audit-zod-coverage.ts` will walk `server/routes.ts`
and fail CI if a POST / PUT / PATCH handler destructures `req.body` without
going through `validateBody()` or an `insertXxxSchema.parse()` call. This
converts the pattern from a convention into a gate.

## OWASP posture

This pattern directly addresses:

- **A03: Injection.** Typed, length-bounded strings prevent ORM identifier
  attacks at the input layer.
- **A04: Insecure Design.** Deny-by-default on input — a handler that does
  not declare a schema cannot accept a body.
- **A05: Security Misconfiguration.** The same middleware is applied across
  the codebase rather than ad-hoc per-route validation.
