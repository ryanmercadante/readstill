import { env } from "cloudflare:workers";
import { fetchPage, PageFetchError } from "./fetch-page";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });

/**
 * POST { url } → { url, html }. The address travels in the body, not the query
 * string, so it never appears in request logs.
 */
export async function handlePageImport(request: Request): Promise<Response> {
  // Browsers mark cross-site calls; only Still's own pages may use this endpoint.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return json({ error: "Not allowed." }, 403);
  const limiter = env.PAGE_IMPORT_LIMITER;
  if (limiter) {
    const key = request.headers.get("cf-connecting-ip") ?? "unknown";
    if (!(await limiter.limit({ key })).success)
      return json({ error: "Too many imports at once. Wait a minute and try again." }, 429);
  }
  let url: unknown;
  try {
    url = ((await request.json()) as { url?: unknown }).url;
  } catch {
    url = undefined;
  }
  if (typeof url !== "string") return json({ error: "Enter a web address." }, 400);
  try {
    return json(await fetchPage(url));
  } catch (error) {
    if (error instanceof PageFetchError) return json({ error: error.message }, error.status);
    return json({ error: "Still couldn't open this page." }, 500);
  }
}
