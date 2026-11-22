import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPromptContext = createContext<{
  installed: boolean;
  install: (() => Promise<void>) | null;
} | null>(null);

// Capture the browser's one-use prompt even when the visitor lands outside the library.
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const available = (event: Event) => {
      event.preventDefault();
      setInstalled(false);
      setPrompt(event as InstallEvent);
    };
    const complete = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", complete);
    return () => {
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  const value = useMemo(() => {
    const install =
      prompt &&
      (async () => {
        setPrompt(null);
        try {
          await prompt.prompt();
          if ((await prompt.userChoice).outcome === "accepted") setInstalled(true);
        } catch {
          // The browser can withdraw the prompt. The manual instructions remain available.
        }
      });
    return { installed, install };
  }, [installed, prompt]);

  return <InstallPromptContext value={value}>{children}</InstallPromptContext>;
}

export function useInstallPromptContext() {
  const context = useContext(InstallPromptContext);
  if (!context)
    throw new Error("useInstallPromptContext must be used within InstallPromptProvider");
  return context;
}
