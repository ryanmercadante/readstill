import { Button } from "../ui/button";
import type { RefObject } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogHeader,
} from "../ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "../ui/drawer";
import { useCompactViewport } from "../../hooks/useCompactViewport";
import { ArrowRight, X } from "lucide-react";

type AboutReaderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

const title = "A little more focus.";
const closeLabel = "Close about dialog";
const intro =
  "Read freely in Article, follow a moving word highlight in Guided, or see one word at a time in Focus. You choose the pace.";

export function AboutReaderDialog({ open, onOpenChange, returnFocusRef }: AboutReaderDialogProps) {
  const compact = useCompactViewport();
  return (
    <>
      <Dialog open={open && !compact} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} finalFocus={returnFocusRef}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogClose render={<Button variant="ghost" />} aria-label={closeLabel}>
              <X size={20} />
            </DialogClose>
          </DialogHeader>
          <DialogDescription className="text-[14px] leading-[1.8]">{intro}</DialogDescription>
          <AboutBody />
        </DialogContent>
      </Dialog>
      {/* On phones this is a content-height bottom sheet that swipes down to dismiss. */}
      <Drawer open={open && compact} onOpenChange={onOpenChange}>
        <DrawerContent
          finalFocus={returnFocusRef}
          header={
            <div className="flex items-center justify-between gap-[10px]">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerClose render={<Button variant="ghost" />} aria-label={closeLabel}>
                <X size={20} />
              </DrawerClose>
            </div>
          }
        >
          <DrawerDescription className="mt-0 text-[14px] leading-[1.8]">{intro}</DrawerDescription>
          <AboutBody />
        </DrawerContent>
      </Drawer>
    </>
  );
}

function AboutBody() {
  return (
    <>
      <p className="text-[14px] leading-[1.8] text-muted-foreground">
        Focus uses rapid serial visual presentation, or RSVP. The colored letter provides a steady
        visual anchor. It isn't a promise of faster reading or better comprehension.
      </p>
      <p className="text-[14px] leading-[1.8] text-muted-foreground">
        Pause, reread, and slow down whenever you need to. The WPM setting controls presentation
        speed; punctuation pauses make the actual pace slower.
      </p>
      <a
        className="inline-flex items-center gap-2 text-[12px] text-brand"
        href="https://journals.sagepub.com/doi/10.1177/1529100615623267"
        target="_blank"
        rel="noreferrer"
      >
        Read the research review
        <ArrowRight size={15} />
      </a>
      <p className="mt-6 border-0 border-t border-solid border-border pt-[18px] text-[11px] leading-[1.8] text-muted-foreground">
        Your library and reading positions are saved in this browser. Clearing browser data removes
        them. Export a backup from Library to keep a copy or move to another device. There are no
        accounts, uploads, or automatic cross-device sync.
      </p>
    </>
  );
}
