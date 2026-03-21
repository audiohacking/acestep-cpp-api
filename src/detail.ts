/** AceStep API error responses use `{ "detail": "..." }` with HTTP status (see API.md § Error Handling). */
export function detailRes(detail: string, status: number): Response {
  return new Response(JSON.stringify({ detail }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
