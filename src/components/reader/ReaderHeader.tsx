import { Button } from "../ui/button";
import { Info, Plus } from "lucide-react";
import { SiteHeader } from "../SiteHeader";
import type { RefObject } from "react";

type ReaderHeaderProps = {
  disabled: boolean;
  onShortcutsOpen?: () => void;
  onAbout: () => void;
  onPaste: () => void;
  pasteRef: RefObject<HTMLButtonElement | null>;
};

export function ReaderHeader({
  disabled,
  onAbout,
  onPaste,
  pasteRef,
  onShortcutsOpen,
}: ReaderHeaderProps) {
  return (
    <SiteHeader onShortcutsOpen={onShortcutsOpen}>
      <div className="flex items-center gap-[22px] max-[520px]:gap-1">
        <Button
          variant="ghost"
          className="about-button max-[520px]:min-w-9"
          aria-label="About this reader"
          onClick={onAbout}
        >
          <Info size={19} />
        </Button>
        <Button
          variant="outline"
          className="paste-button max-[520px]:min-w-9 max-[520px]:px-2 max-[520px]:py-[9px]"
          ref={pasteRef}
          onClick={onPaste}
          disabled={disabled}
          aria-label="Paste text"
        >
          <Plus size={17} />
          <span className="max-[520px]:hidden">Paste text</span>
        </Button>
      </div>
    </SiteHeader>
  );
}
