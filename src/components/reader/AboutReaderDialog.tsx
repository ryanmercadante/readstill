import type { RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowRight, X } from "lucide-react";

type AboutReaderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export function AboutReaderDialog({
  open,
  onOpenChange,
  returnFocusRef,
}: AboutReaderDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="about-dialog" finalFocus={returnFocusRef}>
          <div className="dialog-top">
            <Dialog.Title>A little more focus.</Dialog.Title>
            <Dialog.Close
              className="icon-button"
              aria-label="Close about dialog"
            >
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description>
            Still lets you move between a whole passage and one word at a time.
            You choose the pace.
          </Dialog.Description>
          <p>
            This technique is called rapid serial visual presentation, or RSVP.
            The colored letter provides a steady visual anchor. It isn't a
            promise of faster reading or better comprehension.
          </p>
          <p>
            Pause, reread, and slow down whenever you need to. The WPM setting
            controls presentation speed; punctuation pauses make the actual pace
            slower.
          </p>
          <a
            href="https://journals.sagepub.com/doi/10.1177/1529100615623267"
            target="_blank"
            rel="noreferrer"
          >
            Read the research review
            <ArrowRight size={15} />
          </a>
          <p className="privacy-note">
            Your text and position are saved in this browser. Clearing browser
            data removes them. There are no accounts, uploads, or cross-device
            sync.
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
