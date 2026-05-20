/**
 * Lightweight Zod request-body parser.
 *
 * Use:
 *   const body = await parseJson(c, MySchema);
 *   if (body instanceof Response) return body; // 400 already returned
 */
import type { Context } from "hono";
import type { z } from "zod";

export async function parseJson<T extends z.ZodTypeAny>(
  c: Context,
  schema: T
): Promise<z.infer<T> | Response> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json(
      { error: { message: "Invalid JSON body", code: "INVALID_JSON" } },
      400
    );
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return c.json(
      {
        error: {
          message: "Validation failed",
          code: "VALIDATION_FAILED",
          details: result.error.issues,
        },
      },
      400
    );
  }
  return result.data as z.infer<T>;
}
