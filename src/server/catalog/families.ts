import { createHash } from "node:crypto";
import { normalizeKey, slugify, valuesFromSpec } from "./normalization";

const TYPE_PATTERNS: Array<[string, RegExp]> = [
  ["jogo-de-cama", /jogo de cama/],
  ["jogo-de-colcha", /jogo de colcha|\bcolcha\b/],
  ["edredom", /edredom/],
  ["lencol", /lencol/],
  ["fronha", /fronha|porta travesseiro/],
  ["travesseiro", /travesseiro/],
  ["protetor", /protetor/],
  ["pillow-top", /pillow top/],
  ["toalha", /toalha|tapete|piso/],
  ["roupao", /roupao/],
  ["almofada", /almofada/],
  ["duvet", /duvet/],
];

const SIZE_WORDS = /\b(super\s*king|king|queen|casal|solteiro|baby|junior|padrao)\b/gi;
const DIMENSIONS = /\b\d+(?:[.,]\d+)?\s*(?:cm|m)?\s*x\s*\d+(?:[.,]\d+)?\s*(?:cm|m)?\b/gi;

export type FamilyCandidateProduct = {
  id: string;
  name: string;
  description: string;
  brand: string;
  categoryPaths: string[];
  specifications: Record<string, unknown>;
};

export function canonicalProductType(product: Pick<FamilyCandidateProduct, "name" | "categoryPaths">) {
  const paths = product.categoryPaths.filter((path) => !normalizeKey(path).startsWith("promocoes"));
  const haystack = normalizeKey([...paths.sort((a, b) => b.length - a.length), product.name].join(" "));
  return TYPE_PATTERNS.find(([, pattern]) => pattern.test(haystack))?.[0] ?? slugify(paths.at(0) ?? "produto");
}

function variantLabels(specifications: Record<string, unknown>) {
  const labels = [];
  for (const [key, value] of Object.entries(specifications)) {
    const normalized = normalizeKey(key);
    if (normalized === "cor" || normalized === "cor principal" || normalized.startsWith("tamanho")) {
      labels.push(...valuesFromSpec(value));
    }
  }
  return labels.sort((a, b) => b.length - a.length);
}

export function deriveFamilyName(product: FamilyCandidateProduct) {
  let value = product.name;
  for (const label of variantLabels(product.specifications)) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    value = value.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  }
  value = value.replace(DIMENSIONS, " ").replace(SIZE_WORDS, " ").replace(/\s+/g, " ").trim();
  return value.length >= 8 ? value : product.name;
}

export function familyCandidateKey(product: FamilyCandidateProduct) {
  const description = normalizeKey(product.description);
  if (description.length < 80) return `single:${product.id}`;
  const type = canonicalProductType(product);
  const digest = createHash("sha256").update(`${normalizeKey(product.brand)}|${type}|${description}`).digest("hex").slice(0, 20);
  return `group:${digest}`;
}

export function familySlug(name: string, candidateKey: string) {
  const suffix = createHash("sha256").update(candidateKey).digest("hex").slice(0, 8);
  return `${slugify(name).slice(0, 170)}-${suffix}`;
}
