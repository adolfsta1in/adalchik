import { ImageResponse } from "next/og";

/** Иконка приложения: два цвета игроков и «VS». */
export function arenaIcon(size: number) {
  const s = size;
  return new ImageResponse(
    (
      <div style={{ width: s, height: s, display: "flex", background: "#0c0d10", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: s / 2, height: s, background: "#f97316" }} />
        <div style={{ position: "absolute", right: 0, top: 0, width: s / 2, height: s, background: "#0ea5e9" }} />
        <div
          style={{
            position: "absolute", left: s * 0.18, top: s * 0.18, width: s * 0.64, height: s * 0.64,
            borderRadius: s * 0.16, background: "#0c0d10", color: "#fff", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: s * 0.3, fontWeight: 800,
          }}
        >
          VS
        </div>
      </div>
    ),
    { width: s, height: s },
  );
}
