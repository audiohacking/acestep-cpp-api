/** Flatten AceStep API metas / metadata / user_metadata into the root body. */
export function mergeMetadata(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  const metas = (body.metas ?? body.metadata ?? body.user_metadata) as Record<string, unknown> | undefined;
  if (metas && typeof metas === "object") {
    for (const [k, v] of Object.entries(metas)) {
      if (out[k] === undefined || out[k] === null || out[k] === "") {
        out[k] = v;
      }
    }
  }
  return out;
}

/** Parse param_obj for /format_input (JSON string). */
export function parseParamObj(raw: unknown): Record<string, unknown> {
  if (raw == null || raw === "") return {};
  const s = typeof raw === "string" ? raw : JSON.stringify(raw);
  try {
    const o = JSON.parse(s) as unknown;
    return typeof o === "object" && o != null && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
