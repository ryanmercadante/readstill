import { useEffect, useRef, useState } from "react";
import { ChevronDown, EllipsisVertical, MonitorDown, Share, SquarePlus } from "lucide-react";
import { useInstallPromptContext } from "../hooks/useInstallPrompt";
import {
  detectInstallInstructions,
  type InstallInstructions,
  type InstallIllustration,
} from "../lib/install-instructions";
import { Button } from "./ui/button";

export function InstallGuide({
  onExportLibrary,
  busy,
}: {
  onExportLibrary?: () => void;
  busy: boolean;
}) {
  const [guide, setGuide] = useState<InstallInstructions | null>(null);
  const { install, installed } = useInstallPromptContext();
  const [step, setStep] = useState(0);
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => setGuide(detectInstallInstructions(navigator)), []);
  if (installed) return null;
  const backupAction = onExportLibrary && (
    <div className="mt-3 border-t border-border pt-3">
      <p className="m-0 leading-relaxed">
        To bring your saved readings and progress with you, export your library now. In the
        installed app, open Library and choose <strong>Restore backup</strong> to load the file.
      </p>
      <Button className="mt-2" variant="outline" disabled={busy} onClick={onExportLibrary}>
        Export library
      </Button>
    </div>
  );
  let content;
  if (guide?.kind === "walkthrough") {
    const lastStep = step === guide.steps.length - 1;
    content = (
      <section
        aria-label={guide.label + " installation walkthrough"}
        className="rounded-xl border border-border p-4"
      >
        <div aria-live="polite" aria-atomic="true">
          <p className="m-0 text-xs text-muted-foreground">
            {guide.label} · Step {step + 1} of {guide.steps.length}
          </p>
          <p className="my-3 leading-relaxed">{guide.steps[step].text}</p>
        </div>
        <div
          aria-hidden="true"
          className="flex min-h-24 flex-col justify-center gap-2 rounded-lg bg-accent p-3"
        >
          <StepIllustration illustration={guide.steps[step].illustration} />
        </div>
        {backupAction}
        <div className="mt-3 flex justify-between gap-2">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!lastStep) setStep(step + 1);
              else if (details.current) {
                details.current.open = false;
                summary.current?.focus();
              }
            }}
          >
            {!lastStep ? "Next" : "Done"}
          </Button>
        </div>
      </section>
    );
  } else if (guide?.kind === "firefox") {
    content = (
      <section
        aria-label={guide.label + " installation guide"}
        className="rounded-xl border border-border p-4"
      >
        <p className="m-0 text-xs text-muted-foreground">{guide.label}</p>
        <p className="mb-0 mt-2 leading-relaxed">{guide.text}</p>
        {guide.offerBackup && backupAction}
      </section>
    );
  } else if (guide?.kind === "chromium" || install) {
    const android = guide?.android;
    content = (
      <section
        aria-label="Browser installation guide"
        className="rounded-xl border border-border p-4"
      >
        <div
          aria-hidden="true"
          className="flex items-center gap-3 rounded-full bg-accent px-4 py-2"
        >
          <span className="flex-1 text-xs">readstill.app</span>
          <span className="rounded-md bg-background p-1.5 text-brand">
            {android ? <EllipsisVertical size={20} /> : <MonitorDown size={20} />}
          </span>
        </div>
        <p className="my-3 leading-relaxed">
          {android
            ? "Open the browser menu beside the address bar and look for Install app or Add to Home screen."
            : "Look for the install icon at the right end of the address bar. You can also look for Install in the browser menu."}
        </p>
        {install && (
          <Button variant="outline" onClick={install}>
            <MonitorDown size={17} /> Install Still
          </Button>
        )}
      </section>
    );
  } else {
    content = (
      <ul className="m-0 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
        <li>
          <strong>iPhone or iPad:</strong> In Safari, tap Share, then Add to Home Screen. If shown,
          turn on Open as Web App.
        </li>
        <li>
          <strong>Mac with Safari:</strong> Choose Share → Add to Dock.
        </li>
        <li>
          <strong>Chrome, Brave, or Edge:</strong> Look for the install icon in the address bar or
          the install option in the browser menu.
        </li>
      </ul>
    );
  }
  return (
    <details
      ref={details}
      className="group mt-2 max-w-sm text-sm [@media(display-mode:standalone)]:hidden"
    >
      <summary
        ref={summary}
        onClick={() => setStep(0)}
        className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-primary hover:underline"
      >
        How to install Still
        <ChevronDown size={15} aria-hidden="true" className="group-open:rotate-180" />
      </summary>
      {content}
    </details>
  );
}

function StepIllustration({ illustration }: { illustration: InstallIllustration }) {
  switch (illustration) {
    case "dock":
      return (
        <div className="rounded-lg bg-background p-3">
          <div className="flex items-center gap-3 border-b border-border pb-2 text-xs">
            <span className="flex-1 text-center">readstill.app</span>
            <span className="rounded bg-accent p-1.5">
              <Share size={19} />
            </span>
          </div>
          <div className="mt-2 rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground">
            Add to Dock
          </div>
        </div>
      );
    case "share":
      return (
        <div className="flex items-center gap-3 rounded-lg bg-background px-3 py-2">
          <span className="flex-1 text-center text-xs">readstill.app</span>
          <Share size={22} className="text-primary" />
        </div>
      );
    case "homeScreen":
      return (
        <div className="flex items-center justify-between rounded-lg bg-background p-3 font-semibold">
          Add to Home Screen <SquarePlus size={20} />
        </div>
      );
    case "confirmWebApp":
    case "confirm":
      return (
        <div className="rounded-lg bg-background p-3">
          <div className="flex items-center gap-2">
            <img src="/icons/still-180.png" alt="" width="32" height="32" className="rounded-lg" />
            Still{" "}
            <span className="ml-auto rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Add
            </span>
          </div>
          {illustration === "confirmWebApp" && (
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
              Open as Web App{" "}
              <span className="flex w-7 justify-end rounded-full bg-primary p-0.5">
                <span className="size-3 rounded-full bg-primary-foreground" />
              </span>
            </div>
          )}
        </div>
      );
  }
}
