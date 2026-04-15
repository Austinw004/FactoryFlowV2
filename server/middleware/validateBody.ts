/**
 * validateBody — small middleware factory that replaces the pattern:
 *
 *   app.post("/api/x", isAuthenticated, async (req, res) => {
 *     const { a, b, c } = req.body;  // no validation
 *     if (!a?.trim()) return res.status(400).json({ error: "a required" });
 *     ...
 *   });
 *
 * with:
 *
 *   const bodySchema = z.object({ a: z.string().trim().min(1), ... });
 *   app.post("/api/x", isAuthenticated, validateBody(bodySchema), async (req, res) => {
 *     const { a, b, c } = req.validated!;  // typed, already sanitized
 *     ...
 *   });
 *
 * On failure the middleware returns a single 400 with a stable, machine-readable
 * error payload so client code can render field-level messages:
 *
 *   { error: "Validation failed", fields: { fieldName: "error message", … } }
 */

import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny, infer as ZodInfer } from "zod";

declare global {
  namespace Express {
    interface Request {
      validated?: unknown;
    }
  }
}

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".") || "_";
        if (!fields[path]) fields[path] = issue.message;
      }
      return res.status(400).json({ error: "Validation failed", fields });
    }
    req.validated = result.data;
    next();
  };
}

// Convenience helper — matching shape of req.query / req.params validation is
// a common follow-up need.
export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".") || "_";
        if (!fields[path]) fields[path] = issue.message;
      }
      return res.status(400).json({ error: "Query validation failed", fields });
    }
    req.validated = result.data;
    next();
  };
}

/** Helper to read validated body as a typed value. */
export function getValidated<T extends ZodTypeAny>(req: Request): ZodInfer<T> {
  return req.validated as ZodInfer<T>;
}
