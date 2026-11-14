import { Info, Plus } from "lucide-react";
import { Wordmark } from "../Wordmark";

type ReaderHeaderProps = {
  disabled: boolean;
  onAbout: () => void;
  onPaste: () => void;
};

export function ReaderHeader({
  disabled,
  onAbout,
  onPaste,
}: ReaderHeaderProps) {
  return (
    <header className="site-header">
      <Wordmark />
      <span className="tagline">Make room for reading.</span>
      <div className="header-actions">
        <button
          className="icon-button about-button"
          aria-label="About this reader"
          onClick={onAbout}
        >
          <Info size={19} />
        </button>
        <button
          className="text-button paste-button"
          onClick={onPaste}
          disabled={disabled}
        >
          <Plus size={17} />
          Paste text
        </button>
      </div>
    </header>
  );
}
