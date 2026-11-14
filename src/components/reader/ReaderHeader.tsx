import { Button } from "../ui/button";
import { Info, Plus } from "lucide-react";
import { SiteHeader } from "../SiteHeader";
import type { RefObject } from "react";

type ReaderHeaderProps = {
  disabled: boolean;
  onAbout: () => void;
  onPaste: () => void;
  pasteRef: RefObject<HTMLButtonElement | null>;
};

export function ReaderHeader({ disabled, onAbout, onPaste, pasteRef }: ReaderHeaderProps) {
  return (
    <SiteHeader>
      <div className="flex items-center gap-[22px] max-[520px]:gap-1">
        <Button
          variant="ghost"
          className="about-button"
          aria-label="About this reader"
          onClick={onAbout}
        >
          <Info size={19} />
        </Button>
        <Button
          variant="outline"
          className="paste-button max-[520px]:px-3 max-[520px]:py-[9px]"
          ref={pasteRef}
          onClick={onPaste}
          disabled={disabled}
          aria-label="Paste text"
        >
          <Plus size={17} />
          <span className="max-[380px]:hidden">Paste text</span>
        </Button>
      </div>
    </SiteHeader>
  );
}
