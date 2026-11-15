import { useEffect, useRef, type RefObject } from "react";
import { Keyboard, X } from "lucide-react";
import { useCompactViewport } from "../hooks/useCompactViewport";
import { useReader } from "../hooks/useReader";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "./ui/drawer";

const groups = [
  {
    title: "Reading",
    note: "When focus is on the passage or page, outside controls and dialogs. In Article, play opens Focus; in Guided, it follows the highlight.",
    shortcuts: [
      ["Play or pause", "Space"],
      ["Previous word and pause", "←"],
      ["Next word and pause", "→"],
      ["Replay the sentence and pause", "R"],
      ["Return from Focus to Article", "Esc"],
    ],
  },
  {
    title: "Reading mode",
    note: "When Article, Guided, or Focus has keyboard focus.",
    shortcuts: [
      ["Move between mode buttons", "← / →"],
      ["First or last mode button", "Home / End"],
      ["Select the focused mode", "Enter / Space"],
    ],
  },
  {
    title: "Reading pace",
    note: "When the pace slider has keyboard focus. The range is 100–700 WPM.",
    shortcuts: [
      ["Increase by 25 WPM", "↑ / →"],
      ["Decrease by 25 WPM", "↓ / ←"],
      ["Change by 100 WPM", "Shift + arrow"],
      ["Increase by 100 WPM", "Page Up"],
      ["Decrease by 100 WPM", "Page Down"],
      ["Slowest or fastest pace", "Home / End"],
    ],
  },
  {
    title: "Getting around",
    note: "Available throughout Still. Standard text-editing shortcuts work in text fields.",
    shortcuts: [
      ["Open this legend", "?"],
      ["Next control", "Tab"],
      ["Previous control", "Shift + Tab"],
      ["Activate a button", "Enter / Space"],
      ["Follow a link", "Enter"],
      ["Close a dialog", "Esc"],
    ],
  },
  {
    title: "Chapters",
    note: "When an EPUB chapter dropdown has keyboard focus. Your browser’s native selection controls apply.",
    shortcuts: [["Move through chapters", "↑ / ↓"]],
  },
];

export function KeyboardShortcuts({
  onOpen,
  open,
  onOpenChange,
  mobileTriggerRef,
}: {
  onOpen?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobileTriggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reader = useReader();
  const changeOpen = (next: boolean) => {
    if (next) {
      reader.pause();
      onOpen?.();
    }
    onOpenChange(next);
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (
        event.key !== "?" ||
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.querySelector('[role="dialog"], [role="menu"]') ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable || event.target.closest("input, textarea, select")))
      )
        return;
      event.preventDefault();
      changeOpen(true);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const compact = useCompactViewport();
  const intro = "Press ? to open this guide. Reading pauses while it’s open.";
  const closeLabel = "Close keyboard shortcuts";

  return (
    <>
      <Dialog open={open && !compact} onOpenChange={changeOpen}>
        <DialogTrigger
          render={<Button variant="ghost" className="max-[520px]:min-w-9" />}
          ref={triggerRef}
          aria-label="Keyboard shortcuts"
          aria-keyshortcuts="Shift+/"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={19} />
        </DialogTrigger>
        <DialogContent showCloseButton={false} finalFocus={triggerRef}>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogClose render={<Button variant="ghost" />} aria-label={closeLabel}>
              <X size={20} />
            </DialogClose>
          </DialogHeader>
          <DialogDescription>{intro}</DialogDescription>
          <ShortcutGroups />
        </DialogContent>
      </Dialog>
      {/* At the mobile breakpoint the legend is a bottom sheet: it opens at a peek
          height, drags up to full height, and swipes down to dismiss. */}
      <Drawer open={open && compact} onOpenChange={changeOpen} snapPoints={SNAP_POINTS}>
        <DrawerContent
          finalFocus={mobileTriggerRef}
          header={
            <>
              <div className="flex items-center justify-between gap-[10px]">
                <DrawerTitle>Keyboard shortcuts</DrawerTitle>
                <DrawerClose render={<Button variant="ghost" />} aria-label={closeLabel}>
                  <X size={20} />
                </DrawerClose>
              </div>
              <DrawerDescription className="mt-1 mb-0">{intro}</DrawerDescription>
            </>
          }
        >
          <ShortcutGroups first="mt-2" />
        </DrawerContent>
      </Drawer>
    </>
  );
}

const SNAP_POINTS = [0.6, 1];
function ShortcutGroups({ first = "mt-6" }: { first?: string }) {
  return groups.map((group, index) => (
    <section key={group.title} className={index === 0 ? first : "mt-6"} aria-label={group.title}>
      <h2 className="m-0 font-sans text-sm font-semibold">{group.title}</h2>
      <p className="mt-2 mb-3 text-xs leading-relaxed text-muted-foreground">{group.note}</p>
      <dl className="m-0">
        {group.shortcuts.map(([action, keys]) => (
          <div
            key={action}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 text-xs leading-relaxed"
          >
            <dt>{action}</dt>
            <dd className="m-0">
              <kbd className="mr-0 whitespace-nowrap bg-control">{keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  ));
}
