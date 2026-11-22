import { useEffect, useRef, useState } from "react";
import { ChevronDown, Share, SquarePlus } from "lucide-react";
import { Button } from "./ui/button";

type Device = "iPhone" | "iPad";

function detectDevice(): Device | null {
  if (/iPhone/.test(navigator.userAgent)) return "iPhone";
  // iPadOS can request desktop sites and identify itself as a Mac.
  if (
    /iPad/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  )
    return "iPad";
  return null;
}

export function InstallGuide() {
  const [device, setDevice] = useState<Device | null>(null);
  const [step, setStep] = useState(0);
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => setDevice(detectDevice()), []);
  const descriptions = [
    device === "iPad"
      ? "Open Still in Safari and tap Share in the toolbar."
      : "Open Still in Safari and tap Share. If Share is hidden, open the toolbar menu first.",
    device === "iPad"
      ? "Choose Add to Home Screen. If it’s hidden, tap More to see the other actions."
      : "Scroll to Add to Home Screen. If it’s missing, use Edit Actions to add it.",
    "Leave Open as Web App on if it appears, then tap Add. You can now open Still from your Home Screen.",
  ];
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
      {device ? (
        <section
          aria-label={device + " installation walkthrough"}
          className="rounded-xl border border-border p-4"
        >
          <div aria-live="polite" aria-atomic="true">
            <p className="m-0 text-xs text-muted-foreground">
              {device} · Step {step + 1} of 3
            </p>
            <p className="my-3 leading-relaxed">{descriptions[step]}</p>
          </div>
          <div
            aria-hidden="true"
            className="flex min-h-24 flex-col justify-center gap-2 rounded-lg bg-accent p-3"
          >
            {step === 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-background px-3 py-2">
                <span className="flex-1 text-center text-xs">readstill.app</span>
                <Share size={22} className="text-primary" />
              </div>
            )}
            {step === 1 && (
              <div className="flex items-center justify-between rounded-lg bg-background p-3 font-semibold">
                Add to Home Screen <SquarePlus size={20} />
              </div>
            )}
            {step === 2 && (
              <div className="rounded-lg bg-background p-3">
                <div className="flex items-center gap-2">
                  <img
                    src="/icons/still-180.png"
                    alt=""
                    width="32"
                    height="32"
                    className="rounded-lg"
                  />
                  Still <span className="ml-auto font-semibold text-primary">Add</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                  Open as Web App{" "}
                  <span className="flex w-7 justify-end rounded-full bg-primary p-0.5">
                    <span className="size-3 rounded-full bg-primary-foreground" />
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-between gap-2">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (step < 2) setStep(step + 1);
                else if (details.current) {
                  details.current.open = false;
                  summary.current?.focus();
                }
              }}
            >
              {step < 2 ? "Next" : "Done"}
            </Button>
          </div>
        </section>
      ) : (
        <ul className="m-0 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          <li>
            <strong>iPhone or iPad:</strong> In Safari, tap Share, then Add to Home Screen. If
            shown, turn on Open as Web App.
          </li>
          <li>
            <strong>Mac with Safari:</strong> Choose File → Add to Dock.
          </li>
          <li>
            <strong>Chrome, Brave, or Edge:</strong> Look for the install icon in the address bar or
            the install option in the browser menu.
          </li>
        </ul>
      )}
    </details>
  );
}
