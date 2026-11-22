type StorageManagerLike = Pick<StorageManager, "persist" | "persisted">;

/**
 * Ask the browser to keep this site's storage under storage pressure instead of
 * evicting it. Best effort: browsers may decline or ignore it, and Firefox asks
 * the reader. Resolves to whether storage is persistent; never rejects.
 */
export async function requestPersistentStorage(
  storage: Partial<StorageManagerLike> | undefined = globalThis.navigator?.storage,
): Promise<boolean> {
  try {
    if (!storage?.persist) return false;
    if (await storage.persisted?.()) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}
