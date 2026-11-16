import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen, Info, Keyboard, Menu, Moon, Sun } from "lucide-react";
import { cn } from "cn";
import { useTheme } from "../hooks/useTheme";
import { useReader } from "../hooks/useReader";
import { Wordmark } from "./Wordmark";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { ThemeToggle } from "./ThemeToggle";
import { Button, buttonVariants } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function SiteHeader({ onOverlayOpen }: { onOverlayOpen?: () => void }) {
  const reader = useReader();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const changeOpen = (next: boolean) => {
    if (next) {
      reader.pause();
      onOverlayOpen?.();
    }
    setOpen(next);
  };
  // Open the next dialog only after the menu releases focus.
  const runAfterClose = (action: () => void) => {
    pendingAction.current = action;
    setOpen(false);
  };
  useEffect(() => {
    setOpen(false);
  }, [location.href]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 801px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <header className="sticky top-0 z-20 mx-auto flex max-w-[1320px] items-center gap-8 border-0 border-b border-solid border-border bg-background px-13 py-3 max-[800px]:px-[27px] max-[520px]:gap-1 max-[520px]:px-3 max-[520px]:py-2">
      <Wordmark />
      <div className="ml-auto flex items-center gap-[22px] max-[800px]:hidden">
        <Link
          to="/library"
          activeProps={{ "aria-current": "page" }}
          className={cn(
            buttonVariants({
              variant: "ghost",
              className: "gap-2 text-xs no-underline hover:bg-ghost-hover",
            }),
          )}
        >
          <BookOpen size={19} />
          <span>Library</span>
        </Link>
        <Link
          to="/about"
          activeProps={{ "aria-current": "page" }}
          className={cn(
            buttonVariants({
              variant: "ghost",
              className: "gap-2 text-xs no-underline hover:bg-ghost-hover",
            }),
          )}
        >
          <Info size={19} />
          <span>About</span>
        </Link>
        <KeyboardShortcuts
          onOpen={onOverlayOpen}
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
          mobileTriggerRef={menuRef}
        />
        <ThemeToggle />
      </div>
      <DropdownMenu
        open={open}
        onOpenChange={changeOpen}
        onOpenChangeComplete={(next) => {
          if (!next) {
            const action = pendingAction.current;
            pendingAction.current = null;
            action?.();
          }
        }}
      >
        <DropdownMenuTrigger
          ref={menuRef}
          render={
            <Button
              variant="ghost"
              className="ml-auto min-h-11 gap-2 px-3 text-xs min-[801px]:hidden"
            />
          }
        >
          <Menu size={20} aria-hidden="true" />
          Menu
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-60"
          aria-label="Menu"
          finalFocus={() =>
            window.matchMedia("(max-width: 800px)").matches
              ? menuRef.current
              : document.querySelector<HTMLAnchorElement>('header a[href="/library"]')
          }
        >
          <DropdownMenuItem
            render={<Link to="/library" activeProps={{ "aria-current": "page" }} />}
            className="no-underline aria-[current=page]:bg-accent"
          >
            <BookOpen aria-hidden="true" />
            Library
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link to="/about" activeProps={{ "aria-current": "page" }} />}
            className="no-underline aria-[current=page]:bg-accent"
          >
            <Info aria-hidden="true" />
            About
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => runAfterClose(() => setShortcutsOpen(true))}>
            <Keyboard aria-hidden="true" />
            Keyboard shortcuts
          </DropdownMenuItem>
          <DropdownMenuItem closeOnClick={false} onClick={toggleTheme}>
            {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            Toggle theme
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
