import { describe, expect, it } from "vitest";
import {
  cleanDescription,
  extractCategoryLeaves,
  extractPhoto,
  extractPhotos,
  extractPrice,
  extractReference,
  extractSpecifications,
  transformSku,
  validateRecord,
} from "../../scripts/sync-altenburg-catalog.mjs";

describe("sync-altenburg-catalog helper functions", () => {
  describe("cleanDescription", () => {
    it("should strip HTML tags and normalize text", () => {
      const html =
        "<p>O Jogo de Cama <strong>Toque Acetinado</strong> apresenta conforto.</p><br/><ul><li>100% Algodão</li></ul>";
      const text = cleanDescription(html);
      expect(text).toContain(
        "O Jogo de Cama Toque Acetinado apresenta conforto.",
      );
      expect(text).toContain("100% Algodão");
      expect(text).not.toContain("<p>");
      expect(text).not.toContain("<strong>");
    });

    it("should return empty string for null or undefined", () => {
      expect(cleanDescription(null)).toBe("");
      expect(cleanDescription(undefined)).toBe("");
      expect(cleanDescription("")).toBe("");
    });
  });

  describe("extractPrice", () => {
    it("should return default seller price when available and in stock", () => {
      const item = {
        sellers: [
          {
            sellerDefault: true,
            commertialOffer: {
              IsAvailable: true,
              AvailableQuantity: 10,
              Price: 179.4,
            },
          },
          {
            sellerDefault: false,
            commertialOffer: {
              IsAvailable: true,
              AvailableQuantity: 5,
              Price: 199.0,
            },
          },
        ],
      };
      expect(extractPrice(item)).toBe(179.4);
    });

    it("should fallback to lowest available seller price when default seller is out of stock", () => {
      const item = {
        sellers: [
          {
            sellerDefault: true,
            commertialOffer: {
              IsAvailable: false,
              AvailableQuantity: 0,
              Price: 179.4,
            },
          },
          {
            sellerDefault: false,
            commertialOffer: {
              IsAvailable: true,
              AvailableQuantity: 8,
              Price: 189.9,
            },
          },
          {
            sellerDefault: false,
            commertialOffer: {
              IsAvailable: true,
              AvailableQuantity: 2,
              Price: 199.0,
            },
          },
        ],
      };
      expect(extractPrice(item)).toBe(189.9);
    });

    it("should return null when all sellers are out of stock", () => {
      const item = {
        sellers: [
          {
            sellerDefault: true,
            commertialOffer: {
              IsAvailable: false,
              AvailableQuantity: 0,
              Price: 39.9,
            },
          },
        ],
      };
      expect(extractPrice(item)).toBeNull();
    });

    it("should return null when sellers array is missing or empty", () => {
      expect(extractPrice({})).toBeNull();
      expect(extractPrice({ sellers: [] })).toBeNull();
    });
  });

  describe("extractPhoto and extractPhotos", () => {
    it("should extract all images and convert http to https", () => {
      const item = {
        images: [
          {
            imageUrl:
              "http://altenburg.vteximg.com.br/arquivos/ids/162639/Imagem-1.jpg",
          },
          {
            imageUrl:
              "https://altenburg.vteximg.com.br/arquivos/ids/162640/Imagem-2.jpg",
          },
        ],
      };
      expect(extractPhoto(item)).toBe(
        "https://altenburg.vteximg.com.br/arquivos/ids/162639/Imagem-1.jpg",
      );
      expect(extractPhotos(item)).toEqual([
        "https://altenburg.vteximg.com.br/arquivos/ids/162639/Imagem-1.jpg",
        "https://altenburg.vteximg.com.br/arquivos/ids/162640/Imagem-2.jpg",
      ]);
    });

    it("should return null / empty array when images array is missing or empty", () => {
      expect(extractPhoto({})).toBeNull();
      expect(extractPhotos({})).toEqual([]);
      expect(extractPhoto({ images: [] })).toBeNull();
      expect(extractPhotos({ images: [{ imageUrl: "" }] })).toEqual([]);
    });
  });

  describe("extractSpecifications", () => {
    it("should extract technical specs and ignore markup / Amazon marketing fields", () => {
      const product = {
        allSpecifications: [
          "Tecido",
          "Enchimento",
          "Posição de Dormir",
          "Descrição Premium",
          "meli_shipping_mode",
        ],
        Tecido: ["100% Algodão", "Percal 200 Fios"],
        Enchimento: ["100% Poliuretano"],
        "Posição de Dormir": ["Todas as posições"],
        "Descrição Premium": ["<div>HTML</div>"],
        meli_shipping_mode: ["ME2"],
      };

      const specs = extractSpecifications(product);
      expect(specs).toEqual({
        Tecido: ["100% Algodão", "Percal 200 Fios"],
        Enchimento: "100% Poliuretano",
        "Posição de Dormir": "Todas as posições",
      });
    });
  });

  describe("extractReference", () => {
    it("should extract reference from item first or fallback to product reference", () => {
      const item = {
        referenceId: [{ Key: "RefId", Value: "01674845999001-0.1100" }],
      };
      const product = { productReferenceCode: "01674845999001" };
      expect(extractReference(product, item)).toBe("01674845999001-0.1100");
      expect(extractReference(product, {})).toBe("01674845999001");
    });
  });

  describe("transformSku", () => {
    it("should generate a record with technical specifications and full metadata", () => {
      const product = {
        productId: "3001",
        productName: "Travesseiro Altenburg Signature",
        brand: "Altenburg",
        categories: ["/Travesseiro/Luxo/", "/Travesseiro/"],
        description: "<p>Descrição detalhada do produto</p>",
        allSpecifications: ["Tecido", "Posição de Dormir"],
        Tecido: ["100% Algodão"],
        "Posição de Dormir": ["Todas as posições"],
      };
      const item = {
        itemId: "3429",
        nameComplete: "Travesseiro Altenburg Signature 45cm x 65cm",
        ean: "7899597696153",
        referenceId: [{ Key: "RefId", Value: "01674845999001" }],
        images: [
          {
            imageUrl:
              "https://altenburg.vteximg.com.br/arquivos/ids/162639/Imagem-1.jpg",
          },
        ],
        sellers: [
          {
            sellerDefault: true,
            commertialOffer: {
              IsAvailable: true,
              AvailableQuantity: 50,
              Price: 179.4,
            },
          },
        ],
      };

      const record = transformSku(product, item);
      expect(record).toEqual({
        ID: "3429",
        REFERENCIA: "01674845999001",
        EAN: "7899597696153",
        NOME: "Travesseiro Altenburg Signature 45cm x 65cm",
        DESCRICAO: "Descrição detalhada do produto",
        MARCA: "Altenburg",
        CATEGORIAS: ["Travesseiro/Luxo", "Travesseiro"],
        PRECO: 179.4,
        FOTO: "https://altenburg.vteximg.com.br/arquivos/ids/162639/Imagem-1.jpg",
        FOTOS: [
          "https://altenburg.vteximg.com.br/arquivos/ids/162639/Imagem-1.jpg",
        ],
        ESPECIFICACOES: {
          Tecido: "100% Algodão",
          "Posição de Dormir": "Todas as posições",
        },
      });
    });
  });

  describe("extractCategoryLeaves", () => {
    it("should extract terminal leaves and ignore root Category placeholder", () => {
      const tree = [
        { id: 1, name: "Category", children: [] },
        {
          id: 2,
          name: "Travesseiro",
          children: [
            { id: 3, name: "Básicos", children: [] },
            { id: 4, name: "Luxo", children: [] },
          ],
        },
        {
          id: 54,
          name: "Kit Enxoval Completo",
          children: [],
        },
      ];

      const leaves = extractCategoryLeaves(tree);
      expect(leaves).toEqual([
        { id: 3, name: "Básicos", path: "2/3" },
        { id: 4, name: "Luxo", path: "2/4" },
        { id: 54, name: "Kit Enxoval Completo", path: "54" },
      ]);
    });
  });

  describe("validateRecord", () => {
    it("should pass for valid complete record", () => {
      const valid = {
        ID: "3429",
        REFERENCIA: "01674845999001",
        EAN: "7899597696153",
        NOME: "Jogo de Cama Queen 4 Peças",
        DESCRICAO: "Descrição",
        MARCA: "Altenburg",
        CATEGORIAS: ["Cama Queen"],
        PRECO: 179.4,
        FOTO: "https://altenburg.vteximg.com.br/img.jpg",
        FOTOS: ["https://altenburg.vteximg.com.br/img.jpg"],
        ESPECIFICACOES: { Tecido: "100% Algodão" },
      };
      expect(() => validateRecord(valid, 0)).not.toThrow();
    });

    it("should throw when required key is missing", () => {
      const invalid = {
        ID: "3429",
        NOME: "Jogo de Cama",
        DESCRICAO: "Desc",
        PRECO: 10,
      };
      expect(() => validateRecord(invalid, 0)).toThrow(/chaves inválidas/);
    });
  });
});
