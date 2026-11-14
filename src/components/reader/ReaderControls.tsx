import { Slider } from "../ui/slider";
import { Progress } from "../ui/progress";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import type { RefObject } from "react";
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw } from "lucide-react";
import { MAX_WPM, MIN_WPM } from "../../lib/reader";

type ReaderControlsProps = {
  isSample?: boolean;
  index: number;
  wordCount: number;
  wpm: number;
  ready: boolean;
  playing: boolean;
  finished: boolean;
  saving: boolean;
  storageError: string;
  transitioning: boolean;
  contextPaused?: boolean;
  atContext?: boolean;
  playRef: RefObject<HTMLButtonElement | null>;
  onPlay: () => void;
  onReplay: () => void;
  onSeek: (index: number) => void;
  onWpmChange: (wpm: number) => void;
};

export function ReaderControls({
  isSample = false,
  index,
  wordCount,
  wpm,
  ready,
  playing,
  finished,
  saving,
  storageError,
  transitioning,
  contextPaused = false,
  atContext = false,
  playRef,
  onPlay,
  onReplay,
  onSeek,
  onWpmChange,
}: ReaderControlsProps) {
  const progress = finished ? 100 : Math.round((index / wordCount) * 100);

  if (contextPaused)
    return (
      <footer className="reader-dock fixed bottom-0 left-1/2 z-10 w-[min(100%,1060px)] -translate-x-1/2 bg-background px-5">
        <Progress className="h-0.5 bg-border" aria-label="Reading progress" value={progress} />
        <div className="flex flex-wrap justify-between gap-2 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] text-xs text-muted-foreground">
          <span>{finished ? "Chapter complete" : "Reading paused"}</span>
          <span data-testid="save-status">
            {storageError
              ? "Changes are not saved"
              : saving
                ? "Saving on this device…"
                : "Saved on this device"}
          </span>
        </div>
        {storageError && (
          <p role="status" className="mt-0 text-xs leading-relaxed text-destructive">
            {storageError}
          </p>
        )}
      </footer>
    );

  return (
    <footer className="reader-dock fixed bottom-0 left-1/2 z-10 w-[min(100%,1060px)] -translate-x-1/2 bg-background px-[34px] py-0 max-[800px]:px-7 max-[520px]:px-5">
      <Progress className="h-0.5 bg-border" aria-label="Reading progress" value={progress} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[38px] pt-6 pb-5 max-[800px]:grid-cols-[1fr_auto] max-[800px]:gap-[15px] max-[520px]:gap-3 max-[520px]:py-5">
        <div className="w-[218px] max-[520px]:w-[140px]">
          <Label className="flex justify-between font-semibold" id="pace-label" htmlFor="pace">
            Your pace{" "}
            <span className="text-[10px] font-medium text-muted-foreground">
              <strong className="mr-[3px] text-[14px] text-foreground tabular-nums">{wpm}</strong>{" "}
              WPM
            </span>
          </Label>
          <Slider
            min={MIN_WPM}
            max={MAX_WPM}
            step={25}
            largeStep={100}
            value={[wpm]}
            disabled={!ready || transitioning}
            onValueChange={(value) => onWpmChange(Array.isArray(value) ? value[0] : value)}
            thumbProps={{
              id: "pace",
              "aria-labelledby": "pace-label",
              "aria-describedby": "pace-note",
              getAriaValueText: (_formatted, value) => `${value} words per minute`,
            }}
          />
          <span
            className="block text-[9px] text-muted-foreground max-[520px]:max-w-[140px] max-[520px]:text-[8px] max-[520px]:leading-[1.5]"
            id="pace-note"
          >
            A little breathing room at punctuation
          </span>
        </div>
        <div className="flex items-center gap-2.5 max-[520px]:gap-0.5">
          <Button
            variant="ghost"
            className="max-[520px]:min-w-[34px]"
            title="Replay sentence (R)"
            aria-label="Replay sentence"
            disabled={transitioning || !ready || contextPaused || atContext}
            onClick={onReplay}
          >
            <RotateCcw size={19} />
          </Button>
          <Button
            variant="default"
            ref={playRef}
            className="play-button min-w-[114px] max-[520px]:min-w-[68px] max-[520px]:px-[15px] max-[520px]:py-0"
            onClick={onPlay}
            disabled={!ready || transitioning || contextPaused || (atContext && !finished)}
            aria-label={playing ? "Pause reading" : finished ? "Read again" : "Read passage"}
          >
            {playing ? (
              <Pause size={19} fill="currentColor" />
            ) : finished ? (
              <RotateCcw size={19} />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
            <span className="max-[520px]:hidden">
              {playing ? "Pause" : finished ? "Read again" : "Read"}
            </span>
          </Button>
          <div className="flex gap-0 max-[520px]:flex-col">
            <Button
              variant="ghost"
              className="min-w-8 max-[520px]:min-h-[26px]"
              aria-label="Previous word"
              title="Previous word (←)"
              disabled={transitioning || index === 0 || !ready}
              onClick={() => onSeek(index - 1)}
            >
              <ArrowLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              className="min-w-8 max-[520px]:min-h-[26px]"
              aria-label="Next word"
              title="Next word (→)"
              disabled={transitioning || index === wordCount - 1 || !ready}
              onClick={() => onSeek(index + 1)}
            >
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
        <div className="text-right text-[12px] tabular-nums max-[800px]:hidden">
          <span>
            {index + 1} <span className="mx-[5px] text-muted-foreground">/</span> {wordCount}
          </span>
          <small
            className="mt-2 flex items-center justify-end gap-1 text-[9px] text-muted-foreground"
            data-testid="save-status"
          >
            {isSample ? (
              "Sample · not saved to your library"
            ) : storageError ? (
              "Progress could not be saved"
            ) : !ready ? (
              "Opening your reading…"
            ) : saving ? (
              "Saving on this device…"
            ) : (
              <>
                <Check size={13} />
                Saved on this device
              </>
            )}
          </small>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-0 border-t border-solid border-border pt-[13px] pb-[max(16px,env(safe-area-inset-bottom))] text-[9px] text-muted-foreground max-[520px]:pt-3 max-[520px]:text-[8px]">
        <span id="reading-shortcuts">
          <kbd>space</kbd> play / pause{" "}
          <span className="ml-3.5 max-[520px]:hidden">
            <kbd>←</kbd>
            <kbd>→</kbd> move a word
          </span>
        </span>
        <span>Understanding comes before speed.</span>
      </div>
      {storageError && (
        <p className="m-0 pb-2.5 text-[12px] leading-[1.5] text-destructive" role="status">
          {storageError}
        </p>
      )}
    </footer>
  );
}
