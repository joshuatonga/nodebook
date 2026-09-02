import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#4f46e5",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <svg fill="none" height="124" viewBox="0 0 44 44" width="124">
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
    ),
    size,
  );
}
