import { useState } from "react";
import type { RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowRight, X } from "lucide-react";
import { MAX_TEXT_LENGTH } from "../../reader";
import { SAMPLE_TEXT, SAMPLE_TITLE } from "../../sample";

type PasteTextDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onImport: (text: string, title: string) => void;
};

export function PasteTextDialog({
  open,
  onOpenChange,
  returnFocusRef,
  onImport,
}: PasteTextDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="paste-dialog" finalFocus={returnFocusRef}>
          <div className="dialog-top">
            <Dialog.Title>Something worth reading.</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close paste dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description>
            Paste a passage and make it your own pace. It stays in this browser.
          </Dialog.Description>
          <PasteTextForm onImport={onImport} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// The popup unmounts its contents on close, giving every opening a fresh form.
function PasteTextForm({ onImport }: Pick<PasteTextDialogProps, "onImport">) {
  const [draft, setDraft] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [formError, setFormError] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.trim()) {
          setFormError("Add a few words to start reading.");
          return;
        }
        if (draft.length > MAX_TEXT_LENGTH) {
          setFormError(
            "This first version supports up to 100,000 characters. Try a shorter passage.",
          );
          return;
        }
        onImport(draft, draftTitle);
      }}
    >
      <label htmlFor="draft-title">
        Title <span>(optional)</span>
      </label>
      <input
        id="draft-title"
        value={draftTitle}
        maxLength={100}
        onChange={(e) => setDraftTitle(e.target.value)}
        placeholder="What are you reading?"
      />
      <label htmlFor="draft-text">Your text</label>
      <textarea
        id="draft-text"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setFormError("");
        }}
        placeholder="A story, an essay, a paragraph you've been meaning to read…"
        aria-describedby={formError ? "paste-error" : "paste-limit"}
      />
      <p id="paste-limit" className="form-note">
        Replaces your current reading. Up to 100,000 characters.
      </p>
      {formError && (
        <p id="paste-error" className="form-error" role="alert">
          {formError}
        </p>
      )}
      <div className="dialog-actions">
        <button
          className="sample-button"
          type="button"
          onClick={() => onImport(SAMPLE_TEXT, SAMPLE_TITLE)}
        >
          Use sample instead
        </button>
        <button className="primary-button" type="submit">
          Start reading
          <ArrowRight size={17} />
        </button>
      </div>
    </form>
  );
}
