import { Button } from "../ui/button";
import { BookOpen, Info, Plus } from "lucide-react";
import { SiteHeader } from "../SiteHeader";
import type { RefObject } from "react";

type ReaderHeaderProps = {
  disabled: boolean;
  onAbout: () => void;
  onPaste: () => void;
  onLibrary: () => void;
  libraryOpen: boolean;
  canReturn: boolean;
  pasteRef: RefObject<HTMLButtonElement | null>;
};

export function ReaderHeader({
  disabled,
  onAbout,
  onPaste,
  onLibrary,
  libraryOpen,
  canReturn,
  pasteRef,
}: ReaderHeaderProps) {
  return (
    <SiteHeader>
      <div className="flex items-center gap-[22px] max-[520px]:gap-1">
        <Button
          variant="ghost"
          className="gap-2 text-xs"
          aria-label={libraryOpen ? "Back to reading" : "Library"}
          onClick={onLibrary}
          disabled={disabled || (libraryOpen && !canReturn)}
        >
          <BookOpen size={19} />
          <span className="max-[800px]:hidden">{libraryOpen ? "Back to reading" : "Library"}</span>
        </Button>
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
