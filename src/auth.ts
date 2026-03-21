import { config } from "./config";
import { detailRes } from "./detail";

/** Returns error response if unauthorized; null if no auth or authorized. */
export function requireAuth(authHeader: string | null, bodyToken?: string): Response | null {
  if (!config.apiKey) return null;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : bodyToken;
  return token === config.apiKey ? null : detailRes("Unauthorized", 401);
}
