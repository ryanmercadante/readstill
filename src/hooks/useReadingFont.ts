import { createContext, useContext } from "react";
import type { ReadingFont } from "../lib/reading-font";

export const ReadingFontContext = createContext<{
  font: ReadingFont;
  setFont: (font: ReadingFont) => void;
} | null>(null);

export function useReadingFont() {
  const context = useContext(ReadingFontContext);
  if (!context) throw new Error("useReadingFont must be used within ReadingFontContext");
  return context;
}
