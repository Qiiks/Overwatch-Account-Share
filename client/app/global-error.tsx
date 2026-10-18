"use client";

// global-error replaces the root layout, so the app stylesheet is not guaranteed to be
// loaded here: the DISPATCH palette is inlined instead of referenced by token name.
const ground = "#0B0C0C";
const panel = "#0F1211";
const line = "rgba(255,255,255,0.07)";
const line2 = "rgba(255,255,255,0.13)";
const ink = "#E9EBE4";
const ink2 = "#A3A99F";
const ink3 = "#848B80";
const signal = "#CBEF4A";
const signalInk = "#0B0C0C";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: ground,
          color: ink,
          fontFamily:
            'Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: "14px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "26rem",
            border: `1px solid ${line}`,
            borderRadius: "6px",
            background: panel,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "11px 14px",
              borderBottom: `1px solid ${line}`,
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                background: "#FF5C4D",
                flex: "none",
              }}
            />
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "10px",
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: ink3,
              }}
            >
              Runtime fault
            </span>
          </div>

          <div style={{ padding: "16px 14px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "13px",
                color: ink2,
                lineHeight: 1.5,
              }}
            >
              The page hit an unexpected error. Try again, and reload if it keeps
              happening.
            </p>
            {error.digest && (
              <p
                style={{
                  margin: "10px 0 0",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "11px",
                  color: ink3,
                  overflowWrap: "anywhere",
                }}
              >
                Reference: {error.digest}
              </p>
            )}

            <button
              onClick={reset}
              style={{
                marginTop: "16px",
                height: "34px",
                width: "100%",
                border: `1px solid ${signal}`,
                borderRadius: "6px",
                background: signal,
                color: signalInk,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderTop: `1px solid ${line2}`,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: ink3,
            }}
          >
            Overwatch share · relay offline
          </div>
        </div>
      </body>
    </html>
  );
}
