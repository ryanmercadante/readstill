import type { ReactNode } from "react";

export function SkipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      className="fixed -top-20 left-4 z-100 bg-primary px-5 py-3 text-primary-foreground focus:top-4"
      href={href}
    >
      {children}
    </a>
  );
}
