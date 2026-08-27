export const EDITORIAL_COLLECTION_SLUGS = [
  "cama",
  "colchas-edredons",
  "travesseiros",
  "banho",
] as const;

export type EditorialCollectionSlug = (typeof EDITORIAL_COLLECTION_SLUGS)[number];

const COLLIDING_JSON_SLUGS = new Set(["banho", "travesseiros"]);

export const EDITORIAL_DEPARTMENTS = [
  {
    slug: "cama",
    name: "Cama",
    description: "Jogos de cama, lençóis e complementos para diferentes estilos de loja.",
    sortOrder: 0,
    coverKey: "assets/landing/cama-serenity.jpg",
    imageAlt: "Cama produzida com jogo de cama Altenburg em tons claros",
    categoryPaths: [
      "Cama/Jogos de Cama",
      "Cama/Porta Travesseiros e Fronhas",
      "Cama/Acessórios",
      "Cama/Mantas e Peseiras",
      "Cama/Pillow Top",
      "Cama/Duvets",
      "Saias Box",
      "Protetores de Colchão e Travesseiro",
      "Cobertores",
      "Mundo Kids/Acessórios",
      "Linha Décor/Acessórios",
      "Almofadas & Rolinhos",
    ],
  },
  {
    slug: "colchas-edredons",
    name: "Colchas e edredons",
    description: "Camadas de aconchego, acabamento e presença para o ponto de venda.",
    sortOrder: 1,
    coverKey: "assets/landing/edredom-moment.jpg",
    imageAlt: "Edredom Altenburg em quarto contemporâneo",
    categoryPaths: ["Cama/Edredons", "Cama/Colchas"],
  },
  {
    slug: "travesseiros",
    name: "Travesseiros",
    description: "Opções para diferentes posições de dormir, suportes e tecnologias.",
    sortOrder: 2,
    coverKey: "assets/landing/showcase/travesseiro-plumi-gold.jpg",
    imageAlt: "Travesseiro Altenburg Plumi Gold",
    categoryPaths: ["Travesseiros"],
  },
  {
    slug: "banho",
    name: "Banho",
    description: "Toalhas e coordenados em diferentes cores, tamanhos e composições.",
    sortOrder: 3,
    coverKey: "/images/altenburg/banho-gyo.jpg",
    imageAlt: "Toalhas Altenburg dobradas em diferentes cores",
    categoryPaths: ["Banho/Toalhas de Banho", "Banho/Toalhas de Rosto", "Banho/Pisos"],
  },
] as const satisfies ReadonlyArray<{
  slug: EditorialCollectionSlug;
  name: string;
  description: string;
  sortOrder: number;
  coverKey: string;
  imageAlt: string;
  categoryPaths: readonly string[];
}>;

export function isEditorialCollectionSlug(slug: string): slug is EditorialCollectionSlug {
  return (EDITORIAL_COLLECTION_SLUGS as readonly string[]).includes(slug);
}

export function toCatalogLineSlug(jsonSlug: string): string {
  const slug = jsonSlug.toLowerCase().trim();
  if (COLLIDING_JSON_SLUGS.has(slug)) return `linha-${slug}`;
  return slug;
}

export function toJsonLineSlug(catalogSlug: string): string {
  const slug = catalogSlug.toLowerCase().trim();
  if (slug === "linha-banho") return "banho";
  if (slug === "linha-travesseiros") return "travesseiros";
  return slug;
}

export function getCategoryPath(colSlug: string, tipo: string): string {
  const t = (tipo || "").toUpperCase().trim();
  const slug = toJsonLineSlug(colSlug);

  if (slug === "travesseiros") return "Travesseiros";
  if (slug === "protetores") return "Protetores de Colchão e Travesseiro";
  if (slug === "saia-box") return "Saias Box";
  if (slug === "cobertor") return "Cobertores";
  if (slug === "almofadas") return "Almofadas & Rolinhos";
  if (slug.startsWith("banho")) {
    if (t.includes("ROSTO")) return "Banho/Toalhas de Rosto";
    if (t.includes("PISO")) return "Banho/Pisos";
    return "Banho/Toalhas de Banho";
  }

  if (t.startsWith("EDREDOM") || t.includes("EDREDOM")) return "Cama/Edredons";
  if (t.startsWith("JOGO DE COLCHA") || t.includes("COLCHA")) return "Cama/Colchas";
  if (t.startsWith("ROUPA DE CAMA") || t.includes("LENÇOL")) return "Cama/Jogos de Cama";
  if (t.includes("PORTA TRAVESSEIRO") || t.includes("FRONHA")) {
    return "Cama/Porta Travesseiros e Fronhas";
  }
  if (t.includes("MANTA") || t.includes("PESEIRA")) return "Cama/Mantas e Peseiras";
  if (t.includes("PILLOW TOP")) return "Cama/Pillow Top";
  if (t.includes("DUVET")) return "Cama/Duvets";
  if (t.includes("ALMOFADA")) return "Almofadas & Rolinhos";

  if (slug === "linha-decor") return "Linha Décor/Acessórios";
  if (slug === "acessorios") return "Cama/Acessórios";
  if (slug === "mundo-kids") return "Mundo Kids/Acessórios";

  return "Cama/Acessórios";
}

export function editorialFallback(slug: string) {
  return EDITORIAL_DEPARTMENTS.find((item) => item.slug === slug) ?? null;
}

export function resolveDepartmentCoverKey(slug: string, imageKey: string | null) {
  if (imageKey?.startsWith("collections/")) return imageKey;
  return editorialFallback(slug)?.coverKey ?? imageKey ?? "assets/landing/colcha-online.jpg";
}
