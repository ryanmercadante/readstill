import { MAX_TEXT_LENGTH, MAX_WPM, MIN_WPM } from "@still/reader-core";

export type Snapshot = { version: 1; text: string; title: string; index: number; wpm: number };
export function validSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.text === "string" &&
    v.text.trim().length > 0 &&
    v.text.length <= MAX_TEXT_LENGTH &&
    typeof v.title === "string" &&
    v.title.length <= 100 &&
    Number.isInteger(v.index) &&
    (v.index as number) >= 0 &&
    Number.isInteger(v.wpm) &&
    (v.wpm as number) >= MIN_WPM &&
    (v.wpm as number) <= MAX_WPM
  );
}
