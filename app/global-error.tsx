"use client";

/**
 * The last resort: the root layout itself failed, so nothing else is on
 * screen — not the fonts, not the theme, not the player. It replaces the
 * layout entirely and therefore has to bring its own html and body, and can
 * rely on nothing but inline styles.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          background: "#0a0a0b",
          color: "#f5f4f1",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>Vibe Banger didn&rsquo;t load</h1>
        <p style={{ margin: 0, color: "#a8a7ad", fontSize: 14, maxWidth: 360, lineHeight: 1.5 }}>
          Something went wrong before the app could start. Reloading usually fixes it.
        </p>
        <button
          onClick={retry}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "13px 24px",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "inherit",
            background: "#e3a857",
            color: "#1a1305",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        {error.digest && <p style={{ margin: 0, color: "#6f6e75", fontSize: 12 }}>Reference {error.digest}</p>}
      </body>
    </html>
  );
}
