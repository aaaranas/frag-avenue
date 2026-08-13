"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "frag:install-dismissed";

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    if (window.localStorage?.getItem(DISMISS_KEY) === "1") return;
    setHidden(false);

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

  if (hidden || !event) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* localStorage may be disabled */
    }
    setHidden(true);
  };

  const install = async () => {
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
      className="flex items-center gap-3 border-b border-[color:var(--rule)] bg-[color:var(--bg)]/95 px-5 py-2 text-xs backdrop-blur md:px-12"
    >
      <p className="flex-1 text-[color:var(--fg-muted)]">
        Install <span className="font-serif text-[color:var(--fg)] italic">Frag Avenue</span> for
        one-tap access on your home screen.
      </p>
      <button
        type="button"
        onClick={install}
        className="rounded-sm bg-[color:var(--fg)] px-3 py-1 font-medium tracking-wide text-[color:var(--bg)]"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="px-1 text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]"
        aria-label="Dismiss install prompt"
      >
        Not now
      </button>
    </div>
  );
}
