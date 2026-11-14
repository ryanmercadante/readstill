import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";
import { buttonVariants } from "./ui/button";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 mx-auto flex max-w-[1320px] items-center gap-8 border-0 border-b border-solid border-border bg-background px-13 py-3 max-[800px]:px-[27px] max-[520px]:gap-2.5 max-[520px]:px-5 max-[520px]:py-2">
      <Wordmark />
      <span className="text-[12px] text-muted-foreground max-[520px]:hidden">
        Make room for reading.
      </span>
      <div className="ml-auto flex items-center gap-[22px] max-[520px]:gap-1">
        <Link
          to="/library"
          activeProps={{ "aria-current": "page" }}
          className={buttonVariants({
            variant: "ghost",
            className: "gap-2 text-xs no-underline hover:bg-ghost-hover",
          })}
          aria-label="Library"
        >
          <BookOpen size={19} />
          <span className="max-[800px]:hidden">Library</span>
        </Link>
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
