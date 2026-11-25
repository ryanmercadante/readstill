import { type Reading } from "@still/reader-core";

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name.replace(/[/\\]/g, "_");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
export function downloadOriginal(reading: Reading): void {
  if (!reading.originalEpub) return;
  const bytes = Uint8Array.from(atob(reading.originalEpub.data), (c) => c.charCodeAt(0));
  downloadBlob(new Blob([bytes], { type: "application/epub+zip" }), reading.originalEpub.name);
}
