import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useState } from "react";
import type { RefObject } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogHeader,
  DialogFooter,
} from "../ui/dialog";
import { ArrowRight, X } from "lucide-react";
import { MAX_TEXT_LENGTH } from "../../lib/reader";
import { SAMPLE_TEXT, SAMPLE_TITLE } from "../../lib/sample";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} finalFocus={returnFocusRef}>
        <DialogHeader>
          <DialogTitle>Something worth reading.</DialogTitle>
          <DialogClose render={<Button variant="ghost" />} aria-label="Close paste dialog">
            <X size={20} />
          </DialogClose>
        </DialogHeader>
        <DialogDescription>
          Paste a passage and make it your own pace. It stays in this browser.
        </DialogDescription>
        <PasteTextForm onImport={onImport} />
      </DialogContent>
    </Dialog>
  );
}

// The popup unmounts its contents on close, giving every opening a fresh form.
function PasteTextForm({ onImport }: Pick<PasteTextDialogProps, "onImport">) {
  const [draft, setDraft] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [formError, setFormError] = useState("");

  return (
    <form
      className="mt-6"
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
      <Label className="mt-[17px] mb-2" htmlFor="draft-title">
        Title <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <Input
        id="draft-title"
        value={draftTitle}
        maxLength={100}
        onChange={(e) => setDraftTitle(e.target.value)}
        placeholder="What are you reading?"
      />
      <Label className="mt-[17px] mb-2" htmlFor="draft-text">
        Your text
      </Label>
      <Textarea
        id="draft-text"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setFormError("");
        }}
        placeholder="A story, an essay, a paragraph you've been meaning to read…"
        aria-invalid={!!formError}
        aria-describedby={formError ? "paste-limit paste-error" : "paste-limit"}
      />
      <p id="paste-limit" className="text-[10px] leading-[1.8] text-muted-foreground">
        Replaces your current reading. Up to 100,000 characters.
      </p>
      {formError && (
        <p id="paste-error" className="text-[12px] leading-[1.8] text-destructive" role="alert">
          {formError}
        </p>
      )}
      <DialogFooter>
        <Button variant="text" type="button" onClick={() => onImport(SAMPLE_TEXT, SAMPLE_TITLE)}>
          Use sample instead
        </Button>
        <Button variant="default" className="max-[520px]:w-full" type="submit">
          Start reading
          <ArrowRight size={17} />
        </Button>
      </DialogFooter>
    </form>
  );
}
