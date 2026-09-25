/**
 * FastAPI error responses come in two shapes:
 *   - HTTPException: { "detail": "Some message." }
 *   - Pydantic validation (422): { "detail": [{ "msg": "...", "loc": [...], ... }, ...] }
 * This normalizes either into a single string for the UI.
 */
export function extractFastAPIError(data: unknown, fallback = "Something went wrong."): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (typeof first?.msg === "string") return first.msg;
  }
  return fallback;
}
