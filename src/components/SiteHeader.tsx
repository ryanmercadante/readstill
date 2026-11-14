import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex max-w-[1320px] items-center gap-8 border-0 border-b border-solid border-border px-13 py-7.5 max-[800px]:px-[27px] max-[800px]:py-[23px] max-[520px]:gap-2.5 max-[520px]:p-5">
      <Wordmark />
      <span className="text-[12px] text-muted-foreground max-[520px]:hidden">
        Make room for reading.
      </span>
      <div className="ml-auto flex items-center gap-[22px] max-[520px]:gap-1">
        <ThemeToggle />
        {children}
      </div>
    </header>
  );
}
