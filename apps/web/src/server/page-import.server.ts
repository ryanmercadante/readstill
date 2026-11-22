import { env } from "cloudflare:workers";
import { fetchImage, fetchPage, PageFetchError } from "./fetch-page";

type Limiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

/**
 * Shared checks for the import endpoints. The address travels in a JSON body, not
 * the query string, so it never appears in request logs.
 */
async function importRequest(
  request: Request,
  limiter: Limiter | undefined,
): Promise<{ url: string } | Response> {
  // Browsers mark cross-site calls; only Still's own pages may use these endpoints.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return json({ error: "Not allowed." }, 403);
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
  return typeof url === "string" ? { url } : json({ error: "Enter a web address." }, 400);
}

function failure(error: unknown): Response {
  if (error instanceof PageFetchError) return json({ error: error.message }, error.status);
  return json({ error: "Still couldn't open this page." }, 500);
}

/** POST { url } → { url, html } */
export async function handlePageImport(request: Request): Promise<Response> {
  const input = await importRequest(request, env.PAGE_IMPORT_LIMITER);
  if (input instanceof Response) return input;
  try {
    return json(await fetchPage(input.url));
  } catch (error) {
    return failure(error);
  }
}

/** POST { url } → the image bytes, for one image in an imported article. */
export async function handleImageImport(request: Request): Promise<Response> {
  const input = await importRequest(request, env.IMAGE_IMPORT_LIMITER);
  if (input instanceof Response) return input;
  try {
    const { type, bytes } = await fetchImage(input.url);
    return new Response(bytes, {
      headers: {
        ...headers,
        "content-type": type,
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
