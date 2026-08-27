import { describe, expect, it } from "vitest";
import {
  parseCollectionHtml,
  parseInfoContent,
  slugToTitle,
} from "../../scripts/sync-altenburg-b2b-catalog.mjs";

describe("sync-altenburg-b2b-catalog parser functions", () => {
  describe("slugToTitle", () => {
    it("should format known slugs with custom titles", () => {
      expect(slugToTitle("cetim-sublime-300")).toBe("Cetim Sublime 300 Fios");
      expect(slugToTitle("malha-fio-penteado")).toBe(
        "Malha Fio Penteado 100% Algodão",
      );
      expect(slugToTitle("travesseiros")).toBe("Travesseiros");
      expect(slugToTitle("protetores")).toBe(
        "Protetores de Colchão e Travesseiro",
      );
    });

    it("should format fallback kebab-case slugs gracefully", () => {
      expect(slugToTitle("nova-colecao-2026")).toBe("Nova Colecao 2026");
    });
  });

  describe("parseInfoContent", () => {
    it("should parse padrao, items, sizes, and reference codes", () => {
      const sampleHtml = `
        <h1>POUSO</h1>
        <div class="traco"><img src="traco.jpg" /></div>
        <p><strong>Padrão</strong>: 5680.0 Pouso</p>
        <p><strong>JOGO DE COLCHA</strong></p>
        <p>01201390150001 1,70m x 2,40m Solteiro</p>
        <p>01201390020001 2,10m x 2,40m Casal</p>
        <p>01201390160001 2,60m x 2,40m Queen</p>
        <p>01201390110001 2,80m x 2,60m King</p>
      `;

      const parsed = parseInfoContent(sampleHtml);
      expect(parsed.padrao).toBe("5680.0 Pouso");
      expect(parsed.items).toHaveLength(4);
      expect(parsed.items[0]).toEqual({
        tipo: "JOGO DE COLCHA",
        referencia: "01201390150001",
        medida: "1,70m x 2,40m",
        tamanho: "Solteiro",
        raw: "01201390150001 1,70m x 2,40m Solteiro",
      });
      expect(parsed.items[2].tamanho).toBe("Queen");
    });

    it("should parse multiple of sale and tech specs for pillows", () => {
      const sampleHtml = `
        <h1>GRAN SUITE - LUXO</h1>
        <p>A PARTIR DE 01/11</p>
        <p>MULTIPLO DE 12</p>
        <p>REFERÊNCIA: 01584801700001</p>
        <p>Fibra: Ultra Cloud</p>
        <p>Revestimento: 81% poliamida e 19% elastano</p>
        <p>Enchimento: 100% poliéster 1630 g</p>
        <p>Indicado para quem dorme de lado</p>
      `;

      const parsed = parseInfoContent(sampleHtml);
      expect(parsed.multiplo).toBe("MULTIPLO DE 12");
      expect(parsed.previsao).toBe("A PARTIR DE 01/11");
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].referencia).toBe("01584801700001");
      expect(parsed.detalhes).toContain("Fibra: Ultra Cloud");
      expect(parsed.detalhes).toContain("Indicado para quem dorme de lado");
    });
  });

  describe("parseCollectionHtml", () => {
    it("should parse full collection page with banner and groups", () => {
      const sampleHtml = `
        <div id="topo"><img src="/arquivos/images/banner.jpg" /></div>
        <div id="fundo">
          <p>Descrição geral da coleção</p>
          <div class="fotos">
            <img class="foto-produto" src="admin/foto.php?id=8131&tam=800" />
          </div>
          <div class="info">
            <h1>POUSO</h1>
            <p>Padrão: 5680.0</p>
            <p>EDREDOM</p>
            <p>01201390150001 1,70m x 2,40m Solteiro</p>
          </div>
        </div>
      `;

      const result = parseCollectionHtml(sampleHtml, "malha-fio-penteado");
      expect(result.slug).toBe("malha-fio-penteado");
      expect(result.name).toBe("Malha Fio Penteado 100% Algodão");
      expect(result.banner).toBe(
        "https://catalogo.altenburg.com.br/arquivos/images/banner.jpg",
      );
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].name).toBe("POUSO");
      expect(result.groups[0].foto).toBe(
        "https://catalogo.altenburg.com.br/admin/foto.php?id=8131&tam=800",
      );
      expect(result.groups[0].itens).toHaveLength(1);
    });
  });
});
