import { describe, expect, it } from "vitest";
import { buildProductSearchText, extractFacets, normalizeFacetValue, slugify } from "@/server/catalog/normalization";
import { deriveFamilyName, familyCandidateKey, familySlug } from "@/server/catalog/families";
import { catalogQuerySchema, productInputSchema, productImageUploadSchema } from "@/schemas/products";

describe("product normalization", () => {
  it("creates stable slugs and normalized facet values", () => {
    expect(slugify("Travesseiro Altenburg Plumi Gold")).toBe("travesseiro-altenburg-plumi-gold");
    expect(normalizeFacetValue("  Para dormir de Lado ")).toBe("para dormir de lado");
  });

  it("builds accent-insensitive product search text", () => {
    expect(buildProductSearchText({ name: "Lençol 100% Algodão", reference: "REF-01", ean: null, brand: "Altenburg" }))
      .toBe("lencol 100 algodao ref 01 altenburg");
  });

  it("derives known facets while preserving multiple values", () => {
    expect(extractFacets({
      "Posição de Dormir": ["Para dormir de Lado", "Todas as posições"],
      Suporte: "Suporte Firme",
      "Campo desconhecido": "Não indexar",
    })).toEqual([
      { facetKey: "sleep_position", valueNormalized: "para dormir de lado", valueLabel: "Para dormir de Lado" },
      { facetKey: "sleep_position", valueNormalized: "todas as posicoes", valueLabel: "Todas as posições" },
      { facetKey: "support", valueNormalized: "suporte firme", valueLabel: "Suporte Firme" },
    ]);
  });
});

describe("catalog families", () => {
  const product = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Jogo de Cama Algodão Azul Queen 240cm x 250cm",
    description: "Jogo de cama produzido em algodão de alta qualidade, com toque macio e acabamento cuidadoso para compor diferentes estilos de quarto.",
    brand: "Altenburg",
    categoryPaths: ["Cama/Jogo de Cama"],
    specifications: { Cor: "Azul", Tamanho: "Queen" },
  };

  it("removes variation labels and dimensions from the family name", () => {
    expect(deriveFamilyName(product)).toBe("Jogo de Cama Algodão");
  });

  it("groups only candidates with sufficiently descriptive source data", () => {
    expect(familyCandidateKey(product)).toMatch(/^group:/);
    expect(familyCandidateKey({ ...product, description: "Descrição curta" })).toBe(`single:${product.id}`);
  });

  it("creates deterministic family slugs", () => {
    expect(familySlug(deriveFamilyName(product), familyCandidateKey(product)))
      .toBe(familySlug(deriveFamilyName(product), familyCandidateKey(product)));
  });
});

describe("product schemas", () => {
  it("normalizes product input and supports nullable prices", () => {
    const result = productInputSchema.parse({
      reference: " ref-01 ",
      name: "Produto de teste",
      description: " Descrição ",
      brand: " Altenburg ",
      salePrice: "179.90",
      cost: "",
      categories: ["/Travesseiro/Luxo/", "Travesseiro/Luxo"],
      specifications: { Cor: "Branco" },
    });
    expect(result.reference).toBe("REF-01");
    expect(result.salePrice).toBe(179.9);
    expect(result.cost).toBeNull();
    expect(result.categories).toEqual(["Travesseiro/Luxo"]);
  });

  it("rejects unsupported or oversized image uploads", () => {
    expect(productImageUploadSchema.safeParse({ productId: "not-a-uuid", fileName: "x.gif", contentType: "image/gif", sizeBytes: 20 }).success).toBe(false);
    expect(productImageUploadSchema.safeParse({ productId: "00000000-0000-0000-0000-000000000000", fileName: "x.jpg", contentType: "image/jpeg", sizeBytes: 10 * 1024 * 1024 + 1 }).success).toBe(false);
  });

  it("normalizes public catalog filters and pagination", () => {
    const query = catalogQuerySchema.parse({ color: ["azul", "branco"], page: "2", sort: "NAME_ASC" });
    expect(query.color).toEqual(["azul", "branco"]);
    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(24);
  });
});
