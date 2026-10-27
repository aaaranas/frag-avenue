"use client";

import { useEffect } from "react";

/**
 * Root-layout error boundary. Fires when the root layout itself throws —
 * `error.tsx` cannot recover from that. Ships its own <html>/<body> because
 * the root layout (and so globals.css) may not have rendered; the inline
 * colours are the light theme's tokens.
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
          background: "#fafafa",
          color: "#111111",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
        }}
      >
        <div style={{ maxWidth: "28rem", width: "100%" }}>
          <h1 style={{ fontSize: "1.625rem", lineHeight: 1.2, fontWeight: 600, margin: 0 }}>
            Frag Avenue didn&rsquo;t load
          </h1>
          <p style={{ color: "#4d4d4d", marginTop: "0.5rem", lineHeight: 1.5 }}>
            Refresh the page. If it keeps happening, the problem is on our side.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#6b6b6b", marginTop: "0.75rem" }}>
              Error reference {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              minHeight: "2.75rem",
              background: "#8c5c00",
              color: "#ffffff",
              border: 0,
              borderRadius: "0.5rem",
              padding: "0 1rem",
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
