import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const alt =
  "RF Representa - atendimento comercial Altenburg em Mato Grosso";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  const logoPath = path.join(
    process.cwd(),
    "public",
    "images",
    "brand",
    "rf-logo-white.png",
  );
  const logoBase64 = fs.readFileSync(logoPath).toString("base64");
  const logoSrc = `data:image/png;base64,${logoBase64}`;

  return new ImageResponse(
    <div
      style={{
        background: "#2c4639",
        color: "#ffffff",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#c62e3e",
          bottom: 0,
          display: "flex",
          left: 0,
          position: "absolute",
          top: 0,
          width: 38,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "74px 86px 70px 110px",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex" }}>
          <img
            src={logoSrc}
            alt="RF Representa"
            style={{
              height: 52,
              objectFit: "contain",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#f4b5bc",
              display: "flex",
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 20,
              textTransform: "uppercase",
            }}
          >
            Representação comercial Altenburg
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 750,
              lineHeight: 1.08,
              maxWidth: 930,
            }}
          >
            Conforto para lojistas em todo Mato Grosso.
          </div>
        </div>

        <div
          style={{
            color: "rgba(255,255,255,.7)",
            display: "flex",
            fontSize: 23,
          }}
        >
          Atendimento direto com Rodrigo Figueiredo
        </div>
      </div>
    </div>,
    size,
  );
}
