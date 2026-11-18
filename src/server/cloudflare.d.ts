// The bindings this app uses from wrangler.jsonc.
declare module "cloudflare:workers" {
  export const env: {
    PAGE_IMPORT_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  };
}
