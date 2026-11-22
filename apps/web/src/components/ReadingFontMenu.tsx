import { useState } from "react";
import { Type } from "lucide-react";
import { useReader } from "../hooks/useReader";
import { useReadingFont } from "../hooks/useReadingFont";
import { isReadingFont, readingFonts } from "../lib/reading-font";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/** Each choice, named in its own typeface. Choosing keeps the menu open to compare. */
function ReadingFontOptions() {
  const { font, setFont } = useReadingFont();
  return (
    <DropdownMenuRadioGroup
      value={font}
      onValueChange={(value: string) => {
        if (isReadingFont(value)) setFont(value);
      }}
    >
      {readingFonts.map((option) => (
        <DropdownMenuRadioItem
          key={option.id}
          value={option.id}
          className="text-base"
          style={{ fontFamily: option.family }}
        >
          {option.name}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

export function ReadingFontMenu({ onOpen }: { onOpen?: () => void }) {
  const reader = useReader();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        if (next) {
          reader.pause();
          onOpen?.();
        }
        setOpen(next);
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="size-11 shrink-0"
            aria-label="Reading font"
            title="Reading font"
          />
        }
      >
        <Type size={19} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64" aria-label="Reading font">
        <ReadingFontOptions />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
