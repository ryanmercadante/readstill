import { expect, it } from "vitest";
import { validSnapshot } from "./legacy-snapshot";

it("rejects damaged or incompatible saved data", () => {
  const saved = { version: 1, text: "Some words.", title: "Title", index: 0, wpm: 300 };
  expect(validSnapshot(saved)).toBe(true);
  for (const v of [
    null,
    {},
    { ...saved, wpm: 0 },
    { ...saved, index: -1 },
    { ...saved, text: "" },
    { ...saved, version: 2 },
  ]) {
    expect(validSnapshot(v)).toBe(false);
  }
});
