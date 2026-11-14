import { Slider } from "../ui/slider";
import { Progress } from "../ui/progress";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import type { RefObject } from "react";
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw } from "lucide-react";
import { MAX_WPM, MIN_WPM } from "../../reader";

type ReaderControlsProps = {
  index: number;
  wordCount: number;
  wpm: number;
  ready: boolean;
  playing: boolean;
  finished: boolean;
  saving: boolean;
  storageError: boolean;
  transitioning: boolean;
  playRef: RefObject<HTMLButtonElement | null>;
  onPlay: () => void;
  onReplay: () => void;
  onSeek: (index: number) => void;
  onWpmChange: (wpm: number) => void;
};

export function ReaderControls({
  index,
  wordCount,
  wpm,
  ready,
  playing,
  finished,
  saving,
  storageError,
  transitioning,
  playRef,
  onPlay,
  onReplay,
  onSeek,
  onWpmChange,
}: ReaderControlsProps) {
  const progress = finished ? 100 : Math.round((index / wordCount) * 100);

  return (
    <footer className="reader-dock">
      <Progress className="dock-progress" aria-label="Reading progress" value={progress} />
      <div className="dock-controls">
        <div className="pace-control">
          <Label id="pace-label" htmlFor="pace">
            Your pace{" "}
            <span>
              <strong>{wpm}</strong> WPM
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
          <span className="pace-note" id="pace-note">
            A little breathing room at punctuation
          </span>
        </div>
        <div className="playback-control">
          <Button
            variant="ghost"
            className="icon-button replay-button"
            title="Replay sentence (R)"
            aria-label="Replay sentence"
            disabled={transitioning || !ready}
            onClick={onReplay}
          >
            <RotateCcw size={19} />
          </Button>
          <Button
            variant="default"
            ref={playRef}
            className="play-button"
            onClick={onPlay}
            disabled={!ready || transitioning}
            aria-label={playing ? "Pause reading" : finished ? "Read again" : "Read passage"}
          >
            {playing ? (
              <Pause size={19} fill="currentColor" />
            ) : finished ? (
              <RotateCcw size={19} />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
            <span>{playing ? "Pause" : finished ? "Read again" : "Read"}</span>
          </Button>
          <div className="step-buttons">
            <Button
              variant="ghost"
              className="icon-button"
              aria-label="Previous word"
              title="Previous word (←)"
              disabled={transitioning || index === 0 || !ready}
              onClick={() => onSeek(index - 1)}
            >
              <ArrowLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              className="icon-button"
              aria-label="Next word"
              title="Next word (→)"
              disabled={transitioning || index === wordCount - 1 || !ready}
              onClick={() => onSeek(index + 1)}
            >
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
        <div className="position-info">
          <span>
            {index + 1} <span className="position-divider">/</span> {wordCount}
          </span>
          <small data-testid="save-status">
            {storageError ? (
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
      <div className="dock-bottom">
        <span id="reading-shortcuts">
          <kbd>space</kbd> play / pause{" "}
          <span className="keyboard-extra">
            <kbd>←</kbd>
            <kbd>→</kbd> move a word
          </span>
        </span>
        <span>Understanding comes before speed.</span>
      </div>
      {storageError && (
        <p className="storage-notice" role="status">
          This browser couldn’t save your reading. Keep a copy of your text before closing.
        </p>
      )}
    </footer>
  );
}
