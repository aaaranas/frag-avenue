"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "frag:install-dismissed";

/**
 * iOS Safari never fires `beforeinstallprompt`; installing is a manual
 * Share → Add to Home Screen. `navigator.standalone` exists only on iOS, so it
 * identifies the browser without parsing the user agent.
 */
function isIosBrowser(): boolean {
  return (
    "standalone" in window.navigator && !(window.navigator as { standalone?: boolean }).standalone
  );
}

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* localStorage may be disabled */
    }
    setHidden(false);
    setIos(isIosBrowser());

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const installedHandler = () => setEvent(null);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (hidden || (!event && !ios)) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* localStorage may be disabled */
    }
    setHidden(true);
  };

  const install = async () => {
    if (!event) return;
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      /* prompt() throws if called twice */
    } finally {
      setEvent(null);
      setHidden(true);
    }
  };

  return (
    <div
      role="region"
      aria-label="Install Frag Avenue"
      className="flex items-center gap-3 border-b border-[color:var(--rule)] bg-[color:var(--bg)] px-5 py-1 text-sm md:px-12"
    >
      <p className="flex-1 text-[color:var(--fg-muted)]">
        {event ? (
          "Install Frag Avenue for one-tap access from your home screen."
        ) : (
          <>
            To install, tap <span className="font-medium text-[color:var(--fg)]">Share</span>, then{" "}
            <span className="font-medium text-[color:var(--fg)]">Add to Home Screen</span>.
          </>
        )}
      </p>
      {event ? (
        <button
          type="button"
          onClick={install}
          className="min-h-11 rounded-md bg-[color:var(--fg)] px-4 font-medium text-[color:var(--bg)]"
        >
          Install
        </button>
      ) : null}
      <button
        type="button"
        onClick={dismiss}
        className="min-h-11 px-2 text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
        aria-label="Dismiss install prompt"
      >
        Not now
      </button>
    </div>
  );
}
