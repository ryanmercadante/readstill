import { expect, it, vi } from "vitest";
import { requestPersistentStorage } from "./persistent-storage";

it("reports false where the Storage API isn't available", async () => {
  expect(await requestPersistentStorage(undefined)).toBe(false);
  expect(await requestPersistentStorage({})).toBe(false);
});

it("doesn't ask again when storage is already persistent", async () => {
  const persist = vi.fn(async () => true);
  expect(await requestPersistentStorage({ persisted: async () => true, persist })).toBe(true);
  expect(persist).not.toHaveBeenCalled();
});

it("returns the browser's answer", async () => {
  const persisted = async () => false;
  expect(await requestPersistentStorage({ persisted, persist: async () => true })).toBe(true);
  expect(await requestPersistentStorage({ persisted, persist: async () => false })).toBe(false);
});

it("never rejects", async () => {
  const persist = async () => {
    throw new DOMException("Blocked", "SecurityError");
  };
  expect(await requestPersistentStorage({ persisted: async () => false, persist })).toBe(false);
});
