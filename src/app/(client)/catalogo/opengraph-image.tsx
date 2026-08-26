import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const alt = "Catálogo Altenburg RF Representa - Mix completo para lojistas em MT";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function CatalogOpenGraphImage() {
  const logoPath = path.join(
    process.cwd(),
    "public",
    "images",
    "brand",
    "rf-logo-white.png",
  );
  const logoBase64 = fs.readFileSync(logoPath).toString("base64");
  const logoSrc = `data:image/png;base64,${logoBase64}`;

  const bgPhotoPath = path.join(
    process.cwd(),
    "public",
    "images",
    "altenburg",
    "cama-serenity.jpg",
  );
  const bgPhotoBase64 = fs.readFileSync(bgPhotoPath).toString("base64");
  const bgPhotoSrc = `data:image/jpeg;base64,${bgPhotoBase64}`;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        position: "relative",
        backgroundColor: "#111b16",
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Background Photo on the right side */}
      <img
        src={bgPhotoSrc}
        alt="Altenburg Coleções"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 650,
          height: 630,
          objectFit: "cover",
          objectPosition: "center",
        }}
      />

      {/* Dark gradient overlay blending left to right */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(90deg, #0f1c16 0%, #0f1c16 45%, rgba(15,28,22,0.92) 60%, rgba(15,28,22,0.45) 85%, transparent 100%)",
        }}
      />

      {/* Red vertical brand accent strip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 14,
          background: "#c62e3e",
          display: "flex",
        }}
      />

      {/* Main Content Area */}
      <div
        style={{
          position: "relative",
          
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "54px 64px 50px 72px",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Header: Brand Logo & Tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <img
              src={logoSrc}
              alt="RF Representa"
              style={{
                height: 44,
                objectFit: "contain",
              }}
            />
            <div
              style={{
                width: 1,
                height: 32,
                background: "rgba(255,255,255,0.25)",
                display: "flex",
              }}
            />
            <span
              style={{
                color: "#e2e8e4",
                fontSize: 16,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Altenburg Mato Grosso
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(198, 46, 62, 0.18)",
              border: "1px solid rgba(198, 46, 62, 0.5)",
              borderRadius: 30,
              padding: "6px 18px",
              color: "#fca5a5",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Catálogo Digital
          </div>
        </div>

        {/* Center: Title & Categories */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span
            style={{
              color: "#f4b5bc",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 2.5,
              textTransform: "uppercase",
            }}
          >
            Portfólio Completo para Lojistas
          </span>

          <div
            style={{
              color: "#ffffff",
              fontSize: 54,
              fontWeight: 800,
              lineHeight: 1.1,
              maxWidth: 720,
              display: "flex",
            }}
          >
            Encontre o mix certo para a sua loja.
          </div>

          {/* Category Badges */}
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            {["Cama", "Colchas & Edredons", "Travesseiros", "Banho"].map((cat) => (
              <div
                key={cat}
                style={{
                  display: "flex",
                  background: "rgba(255, 255, 255, 0.12)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: 8,
                  padding: "6px 14px",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {cat}
              </div>
            ))}
          </div>
        </div>

        {/* Footer: Territory & CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 255, 255, 0.15)",
            paddingTop: 18,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "#ffffff", fontSize: 16, fontWeight: 600 }}>
              Atendimento exclusivo para lojistas em MT
            </span>
            <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 13 }}>
              Variações, tamanhos, cores e especificações técnicas
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#c62e3e",
              color: "#ffffff",
              borderRadius: 8,
              padding: "10px 22px",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Ver Catálogo Online →
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
