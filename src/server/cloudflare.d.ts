// The bindings this app uses from wrangler.jsonc.
declare module "cloudflare:workers" {
  type Limiter = { limit(options: { key: string }): Promise<{ success: boolean }> };
  export const env: {
    PAGE_IMPORT_LIMITER?: Limiter;
    IMAGE_IMPORT_LIMITER?: Limiter;
  };
}
