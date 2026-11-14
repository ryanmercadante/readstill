import { Button } from "../ui/button";
import { Info, Plus } from "lucide-react";
import { SiteHeader } from "../SiteHeader";

type ReaderHeaderProps = {
  disabled: boolean;
  onAbout: () => void;
  onPaste: () => void;
};

export function ReaderHeader({ disabled, onAbout, onPaste }: ReaderHeaderProps) {
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
          onClick={onPaste}
          disabled={disabled}
        >
          <Plus size={17} className="max-[360px]:hidden" />
          Paste text
        </Button>
      </div>
    </SiteHeader>
  );
}
