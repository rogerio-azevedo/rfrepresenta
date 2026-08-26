export const FACET_ALIASES: Record<string, string> = {
  colecao: "collection",
  "posicao de dormir": "sleep_position",
  suporte: "support",
  enchimento: "filling",
  "materiais do enchimento": "filling_material",
  tecido: "fabric",
  composicao: "composition",
  "tecido e composicao": "fabric_composition",
  tamanho: "size",
  "tamanho - travesseiro": "size",
  cor: "color",
  "cor principal": "color",
  largura: "width",
  comprimento: "length",
  altura: "height",
  "e lavavel": "washable",
  impermeavel: "waterproof",
  "e antimofo": "mildew_resistant",
  "tecido termorregulador": "thermoregulating_fabric",
  "embalagem compacta": "compact_packaging",
  "embalagem reutilizavel": "reusable_packaging",
  "quantidade de pecas": "piece_count",
  "quantidade de itens": "item_count",
  "itens na embalagem": "package_contents",
};

export function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeFacetValue(value: string) {
  return normalizeKey(value).replace(/\s+/g, " ");
}

export function slugify(value: string) {
  const slug = normalizeKey(value).replace(/\s+/g, "-");
  return slug || "produto";
}

export function buildProductSearchText(input: {
  name: string;
  reference?: string | null;
  ean?: string | null;
  brand: string;
}) {
  return normalizeKey([input.name, input.reference, input.ean, input.brand].filter(Boolean).join(" "));
}

export function valuesFromSpec(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(valuesFromSpec);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export function extractFacets(specifications: Record<string, unknown>) {
  const facets = new Map<string, { valueNormalized: string; valueLabel: string }>();

  for (const [key, value] of Object.entries(specifications)) {
    const facetKey = FACET_ALIASES[normalizeKey(key)];
    if (!facetKey) continue;
    for (const valueLabel of valuesFromSpec(value)) {
      const valueNormalized = normalizeFacetValue(valueLabel);
      if (valueNormalized) facets.set(`${facetKey}:${valueNormalized}`, { valueNormalized, valueLabel });
    }
  }

  return [...facets.entries()].map(([key, value]) => {
    const separator = key.indexOf(":");
    return { facetKey: key.slice(0, separator), ...value };
  });
}
