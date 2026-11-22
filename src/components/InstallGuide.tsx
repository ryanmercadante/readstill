import { useEffect, useRef, useState } from "react";
import { ChevronDown, EllipsisVertical, MonitorDown, Share, SquarePlus } from "lucide-react";
import { useInstallPromptContext } from "../hooks/useInstallPrompt";
import { Button } from "./ui/button";

const firefoxGuides = {
  "Firefox on Android":
    "Open the three-dot menu and tap Install. In the Home Screen prompt, tap Add automatically or drag the Still icon into place.",
  "Firefox on Windows":
    "In a regular Firefox window, look for the web apps button in the address bar. Click it to open Still in its own window. If Windows offers to pin Still to the taskbar, choose Yes.",
  "Firefox on Mac":
    "To add Still to your Dock, open this library URL in Safari on macOS Sonoma 14 or later, then choose Share → Add to Dock.",
  "Firefox on Linux":
    "If your Firefox address bar has a web apps button, click it to open Still in its own window. Otherwise, bookmark your library for quick access.",
} as const;

type Device =
  | keyof typeof firefoxGuides
  | "Firefox on iOS"
  | "iPhone"
  | "iPad"
  | "Mac Safari"
  | "Chromium"
  | "Android Chromium";

function detectDevice(): Device | null {
  if (/FxiOS\//.test(navigator.userAgent)) return "Firefox on iOS";
  if (/iPhone/.test(navigator.userAgent)) return "iPhone";
  // iPadOS can request desktop sites and identify itself as a Mac.
  if (
    /iPad/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  )
    return "iPad";
  if (/Firefox\//.test(navigator.userAgent)) {
    if (/Android/.test(navigator.userAgent)) return "Firefox on Android";
    if (/Windows/.test(navigator.userAgent)) return "Firefox on Windows";
    if (/Macintosh/.test(navigator.userAgent)) return "Firefox on Mac";
    if (/Linux/.test(navigator.userAgent)) return "Firefox on Linux";
  }
  if (/Chrom(?:e|ium)\//.test(navigator.userAgent))
    return /Android/.test(navigator.userAgent) ? "Android Chromium" : "Chromium";
  if (/Macintosh/.test(navigator.userAgent) && /Version\/.*Safari\//.test(navigator.userAgent))
    return "Mac Safari";
  return null;
}

export function InstallGuide({
  onExportLibrary,
  busy,
}: {
  onExportLibrary?: () => void;
  busy: boolean;
}) {
  const [device, setDevice] = useState<Device | null>(null);
  const { install, installed } = useInstallPromptContext();
  const [step, setStep] = useState(0);
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => setDevice(detectDevice()), []);
  const mac = device === "Mac Safari";
  const firefoxIOS = device === "Firefox on iOS";
  const descriptions = firefoxIOS
    ? [
        "In Firefox, tap Share in the address bar.",
        "Choose Add to Home Screen in the share menu.",
        "Confirm the name Still, then tap Add in the top-right corner.",
      ]
    : mac
      ? [
          "In Safari on macOS Sonoma 14 or later, click Share in the top-right corner of the toolbar, then choose Add to Dock.",
          "Keep the name Still or choose your own, then click Add in the lower-right corner. Open Still from your Dock to go to your library.",
        ]
      : [
          device === "iPad"
            ? "Open Still in Safari and tap Share in the toolbar."
            : "Open Still in Safari and tap Share. If Share is hidden, open the toolbar menu first.",
          device === "iPad"
            ? "Choose Add to Home Screen. If it’s hidden, tap More to see the other actions."
            : "Scroll to Add to Home Screen. If it’s missing, use Edit Actions to add it.",
          "Leave Open as Web App on if it appears, then tap Add. You can now open Still from your Home Screen.",
        ];
  if (installed) return null;
  const apple = firefoxIOS || mac || device === "iPhone" || device === "iPad";
  const android = device === "Android Chromium";
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
      {apple ? (
        <section
          aria-label={device + " installation walkthrough"}
          className="rounded-xl border border-border p-4"
        >
          <div aria-live="polite" aria-atomic="true">
            <p className="m-0 text-xs text-muted-foreground">
              {device} · Step {step + 1} of {descriptions.length}
            </p>
            <p className="my-3 leading-relaxed">{descriptions[step]}</p>
          </div>
          <div
            aria-hidden="true"
            className="flex min-h-24 flex-col justify-center gap-2 rounded-lg bg-accent p-3"
          >
            {mac && step === 0 && (
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
            )}
            {!mac && step === 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-background px-3 py-2">
                <span className="flex-1 text-center text-xs">readstill.app</span>
                <Share size={22} className="text-primary" />
              </div>
            )}
            {!mac && step === 1 && (
              <div className="flex items-center justify-between rounded-lg bg-background p-3 font-semibold">
                Add to Home Screen <SquarePlus size={20} />
              </div>
            )}
            {step === descriptions.length - 1 && (
              <div className="rounded-lg bg-background p-3">
                <div className="flex items-center gap-2">
                  <img
                    src="/icons/still-180.png"
                    alt=""
                    width="32"
                    height="32"
                    className="rounded-lg"
                  />
                  Still{" "}
                  <span className="ml-auto rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Add
                  </span>
                </div>
                {!mac && !firefoxIOS && (
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                    Open as Web App{" "}
                    <span className="flex w-7 justify-end rounded-full bg-primary p-0.5">
                      <span className="size-3 rounded-full bg-primary-foreground" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {backupAction}
          <div className="mt-3 flex justify-between gap-2">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (step + 1 < descriptions.length) setStep(step + 1);
                else if (details.current) {
                  details.current.open = false;
                  summary.current?.focus();
                }
              }}
            >
              {step + 1 < descriptions.length ? "Next" : "Done"}
            </Button>
          </div>
        </section>
      ) : device && Object.hasOwn(firefoxGuides, device) ? (
        <section
          aria-label={device + " installation guide"}
          className="rounded-xl border border-border p-4"
        >
          <p className="m-0 text-xs text-muted-foreground">{device}</p>
          <p className="mb-0 mt-2 leading-relaxed">
            {firefoxGuides[device as keyof typeof firefoxGuides]}
          </p>
          {device === "Firefox on Mac" && backupAction}
        </section>
      ) : device || install ? (
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
      ) : (
        <ul className="m-0 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          <li>
            <strong>iPhone or iPad:</strong> In Safari, tap Share, then Add to Home Screen. If
            shown, turn on Open as Web App.
          </li>
          <li>
            <strong>Mac with Safari:</strong> Choose Share → Add to Dock.
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
