/** Unified API response wrapper (AceStep 1.5 API). */
export function jsonRes<T>(data: T, code = 200, error: string | null = null) {
  return Response.json(
    {
      data,
      code,
      error,
      timestamp: Date.now(),
      extra: null,
    },
    { status: code >= 400 ? code : 200, headers: { "Content-Type": "application/json" } }
  );
}

export function errRes(message: string, code = 400) {
  return jsonRes(null, code, message);
}
