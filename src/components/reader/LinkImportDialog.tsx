import { Input } from "../ui/input";
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
import type { Reading } from "../../lib/library";

type LinkImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onImport: (reading: Reading) => void;
};

export function LinkImportDialog({
  open,
  onOpenChange,
  returnFocusRef,
  onImport,
}: LinkImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} finalFocus={returnFocusRef}>
        <DialogHeader>
          <DialogTitle>Read it here instead.</DialogTitle>
          <DialogClose render={<Button variant="ghost" />} aria-label="Close link dialog">
            <X size={20} />
          </DialogClose>
        </DialogHeader>
        <DialogDescription>
          Paste a link to an article. Still fetches the page once and keeps only the text, in this
          browser.
        </DialogDescription>
        <LinkImportForm onImport={onImport} />
      </DialogContent>
    </Dialog>
  );
}

// The popup unmounts its contents on close, giving every opening a fresh form.
function LinkImportForm({ onImport }: Pick<LinkImportDialogProps, "onImport">) {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  return (
    <form
      className="mt-6"
      aria-busy={busy}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (!address.trim()) {
          setFormError("Paste the address of an article to start reading.");
          return;
        }
        setBusy(true);
        setFormError("");
        try {
          const { importWebPage } = await import("../../lib/web-article");
          onImport(await importWebPage(address));
        } catch (error) {
          setFormError(error instanceof Error ? error.message : "This page couldn't be added.");
          setBusy(false);
        }
      }}
    >
      <Label className="mt-[17px] mb-2" htmlFor="link-address">
        Article link
      </Label>
      <Input
        id="link-address"
        // Plain text so "example.com/post" isn't blocked by browser URL validation.
        type="text"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        value={address}
        maxLength={2048}
        disabled={busy}
        onChange={(e) => {
          setAddress(e.target.value);
          setFormError("");
        }}
        placeholder="https://example.com/an-essay-worth-reading"
        aria-invalid={!!formError}
        aria-describedby={formError ? "link-limit link-error" : "link-limit"}
      />
      <p id="link-limit" className="text-[10px] leading-[1.8] text-muted-foreground">
        Adds to your library. Public pages only; images aren’t imported yet.
      </p>
      <p role="status" className="sr-only">
        {busy ? "Opening the page…" : ""}
      </p>
      {formError && (
        <p id="link-error" className="text-[12px] leading-[1.8] text-destructive" role="alert">
          {formError}
        </p>
      )}
      <DialogFooter>
        <Button variant="default" className="max-[520px]:w-full" type="submit" disabled={busy}>
          {busy ? "Opening…" : "Start reading"}
          <ArrowRight size={17} />
        </Button>
      </DialogFooter>
    </form>
  );
}
