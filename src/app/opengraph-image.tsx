import { ImageResponse } from "next/og";

// Route segment config
export const alt = "Endurix — Plataforma para entrenadores y atletas de resistencia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Static social-share card rendered at build/request time. Uses the brand
// palette (paper background, orange accent, near-black ink) — no external
// assets so it renders reliably on the edge/node runtime.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F5F0E8",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              backgroundColor: "#111317",
              color: "#F5F0E8",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 6,
              padding: "10px 20px",
            }}
          >
            SOMOS ENDURIX
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 800,
              color: "#111317",
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            ENTRENA MÁS INTELIGENTE.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 800,
              color: "#F35B04",
              lineHeight: 1,
              letterSpacing: -2,
              marginTop: 8,
            }}
          >
            RINDE POR MÁS TIEMPO.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#111317", opacity: 0.7, maxWidth: 760 }}>
            Coaching todo-en-uno para running: entrenamientos, carga, Strava y Garmin.
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#111317" }}>
            endurix.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
