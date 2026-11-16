import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { SiteHeader } from "../SiteHeader";
import type { RefObject } from "react";

type ReaderHeaderProps = {
  disabled: boolean;
  onOverlayOpen?: () => void;
  onPaste: () => void;
  pasteRef?: RefObject<HTMLButtonElement | null>;
};

export function ReaderHeader({ disabled, onPaste, pasteRef, onOverlayOpen }: ReaderHeaderProps) {
  return (
    <SiteHeader
      onOverlayOpen={onOverlayOpen}
      mobileActions={(run, trigger) => {
        const openAction = (action: () => void) =>
          run(() => {
            if (pasteRef) pasteRef.current = trigger;
            action();
          });
        return (
          <>
            <DropdownMenuItem disabled={disabled} onClick={() => openAction(onPaste)}>
              <Plus aria-hidden="true" />
              Paste text
            </DropdownMenuItem>
          </>
        );
      }}
    >
      <Button
        variant="outline"
        className="paste-button"
        ref={pasteRef}
        onClick={(event) => {
          if (pasteRef) pasteRef.current = event.currentTarget;
          onPaste();
        }}
        disabled={disabled}
        aria-label="Paste text"
      >
        <Plus size={17} />
        <span>Paste text</span>
      </Button>
    </SiteHeader>
  );
}
