import { ImageResponse } from "next/og";

export const socialImageAlt =
  "Nodebook, a local-first infinite workspace shared by people and their agents";

export const socialImageSize = {
  width: 1200,
  height: 630,
};

const nodeStyles = {
  alignItems: "center",
  background: "#ffffff",
  border: "2px solid #e4e4e7",
  borderRadius: 16,
  boxShadow: "0 16px 32px rgba(24, 24, 27, 0.08)",
  color: "#18181b",
  display: "flex",
  fontSize: 22,
  fontWeight: 650,
  height: 76,
  padding: "0 24px",
  position: "absolute" as const,
};

function BrandMark() {
  return (
    <div
      style={{
        alignItems: "center",
        background: "#4f46e5",
        borderRadius: 18,
        display: "flex",
        height: 68,
        justifyContent: "center",
        width: 68,
      }}
    >
      <svg fill="none" height="46" viewBox="0 0 44 44" width="46">
        <path
          d="M10 10v24L34 10v24"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <circle cx="10" cy="10" fill="#fff" r="4.5" />
        <circle cx="10" cy="34" fill="#fff" r="4.5" />
        <circle cx="34" cy="10" fill="#fff" r="4.5" />
        <circle cx="34" cy="34" fill="#fff" r="4.5" />
      </svg>
    </div>
  );
}

export function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#fafafa",
          color: "#18181b",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            backgroundImage: "radial-gradient(#d4d4d8 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
            display: "flex",
            height: "100%",
            opacity: 0.42,
            position: "absolute",
            width: "100%",
          }}
        />
        <div
          style={{
            background: "linear-gradient(90deg, #fafafa 0%, #fafafa 46%, rgba(250,250,250,0.25) 100%)",
            display: "flex",
            height: "100%",
            position: "absolute",
            width: "100%",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: "72px 0 66px 76px",
            position: "relative",
            width: 670,
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
            <BrandMark />
            <span style={{ fontSize: 34, fontWeight: 750, letterSpacing: "-1.2px" }}>
              Nodebook
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 67,
                fontWeight: 760,
                letterSpacing: "-3.6px",
                lineHeight: 1.02,
              }}
            >
              <span>Map the work.</span>
              <span style={{ color: "#4f46e5" }}>Keep the context.</span>
            </div>
            <p
              style={{
                color: "#52525b",
                fontSize: 25,
                lineHeight: 1.38,
                margin: 0,
                width: 570,
              }}
            >
              A local-first infinite workspace shared by people and their agents.
            </p>
          </div>

          <div style={{ alignItems: "center", color: "#71717a", display: "flex", fontSize: 19, gap: 12 }}>
            <span style={{ background: "#4f46e5", borderRadius: 999, height: 9, width: 9 }} />
            Research · Scope · Trace · Learn
          </div>
        </div>

        <div
          style={{
            display: "flex",
            height: "100%",
            position: "absolute",
            right: 0,
            top: 0,
            width: 560,
          }}
        >
          <svg
            fill="none"
            height="630"
            style={{ position: "absolute" }}
            viewBox="0 0 560 630"
            width="560"
          >
            <path d="M52 314C136 314 145 190 230 190" stroke="#a5b4fc" strokeWidth="4" />
            <path d="M230 190C322 190 308 92 402 92" stroke="#c7d2fe" strokeWidth="4" />
            <path d="M230 190C326 190 313 318 414 318" stroke="#818cf8" strokeWidth="4" />
            <path d="M52 314C162 314 162 478 280 478" stroke="#c7d2fe" strokeWidth="4" />
            <circle cx="52" cy="314" fill="#4f46e5" r="8" />
            <circle cx="230" cy="190" fill="#6366f1" r="8" />
            <circle cx="402" cy="92" fill="#818cf8" r="8" />
            <circle cx="414" cy="318" fill="#4f46e5" r="8" />
            <circle cx="280" cy="478" fill="#818cf8" r="8" />
          </svg>

          <div style={{ ...nodeStyles, left: 0, top: 276, width: 210 }}>Research</div>
          <div style={{ ...nodeStyles, left: 172, top: 152, width: 196 }}>Scope</div>
          <div style={{ ...nodeStyles, left: 344, top: 54, width: 178 }}>Build</div>
          <div
            style={{
              ...nodeStyles,
              borderColor: "#a5b4fc",
              color: "#4338ca",
              left: 350,
              top: 280,
              width: 178,
            }}
          >
            Trace
          </div>
          <div style={{ ...nodeStyles, left: 218, top: 440, width: 188 }}>Learn</div>
        </div>

        <div
          style={{
            background: "#4f46e5",
            bottom: 0,
            display: "flex",
            height: 10,
            left: 0,
            position: "absolute",
            width: "100%",
          }}
        />
      </div>
    ),
    socialImageSize,
  );
}
