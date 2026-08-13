"use client";

import { useEffect } from "react";

/**
 * Root-layout error boundary. Fires when the root layout itself throws —
 * `error.tsx` cannot recover from that. Ships its own <html>/<body> because
 * the root layout may not have rendered.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app.global_error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#f7f6f4",
          color: "#16150f",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8f8b7f",
            }}
          >
            Frag Avenue
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "2rem",
              margin: "1rem 0 0",
              fontWeight: 500,
            }}
          >
            The app failed to load.
          </h1>
          <p style={{ color: "#4d4a44", marginTop: "1rem", lineHeight: 1.6, fontSize: "0.9rem" }}>
            Refresh the page. If it keeps happening, something is wrong on our side.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "#8f8b7f",
                marginTop: "0.5rem",
              }}
            >
              Ref: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              background: "#16150f",
              color: "#f7f6f4",
              border: 0,
              borderRadius: 2,
              padding: "0.625rem 1.25rem",
              font: "inherit",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
