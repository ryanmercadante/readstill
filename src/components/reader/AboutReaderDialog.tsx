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
import { ArrowRight, X } from "lucide-react";

type AboutReaderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export function AboutReaderDialog({ open, onOpenChange, returnFocusRef }: AboutReaderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} finalFocus={returnFocusRef}>
        <DialogHeader>
          <DialogTitle>A little more focus.</DialogTitle>
          <DialogClose render={<Button variant="ghost" />} aria-label="Close about dialog">
            <X size={20} />
          </DialogClose>
        </DialogHeader>
        <DialogDescription className="text-[14px] leading-[1.8]">
          Still lets you move between a whole passage and one word at a time. You choose the pace.
        </DialogDescription>
        <p className="text-[14px] leading-[1.8] text-muted-foreground">
          This technique is called rapid serial visual presentation, or RSVP. The colored letter
          provides a steady visual anchor. It isn't a promise of faster reading or better
          comprehension.
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
          Your text and position are saved in this browser. Clearing browser data removes them.
          There are no accounts, uploads, or cross-device sync.
        </p>
      </DialogContent>
    </Dialog>
  );
}
