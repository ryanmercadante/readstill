import { Button } from "../ui/button";
import { Info, Plus } from "lucide-react";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { SiteHeader } from "../SiteHeader";
import type { RefObject } from "react";

type ReaderHeaderProps = {
  disabled: boolean;
  onOverlayOpen?: () => void;
  onAbout: () => void;
  onPaste: () => void;
  pasteRef?: RefObject<HTMLButtonElement | null>;
};

export function ReaderHeader({
  disabled,
  onAbout,
  onPaste,
  pasteRef,
  onOverlayOpen,
}: ReaderHeaderProps) {
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
            <DropdownMenuItem onClick={() => openAction(onAbout)}>
              <Info aria-hidden="true" />
              About this reader
            </DropdownMenuItem>
          </>
        );
      }}
    >
      <div className="flex items-center gap-[22px]">
        <Button
          variant="ghost"
          className="about-button"
          aria-label="About this reader"
          onClick={(event) => {
            if (pasteRef) pasteRef.current = event.currentTarget;
            onAbout();
          }}
        >
          <Info size={19} />
        </Button>
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
      </div>
    </SiteHeader>
  );
}
