import { z } from "zod";

const nullableMoney = z.preprocess(
  (value) => {
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
      return null;
    }
    return value;
  },
  z.coerce.number().finite().min(0).max(9999999999.99).nullable(),
);

const optionalNormalizedText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const productSpecValueSchema = z.union([
  z.string().trim().max(2000),
  z.array(z.string().trim().max(2000)).max(100),
]);

export const productSpecificationsSchema = z
  .record(z.string().trim().min(1).max(160), productSpecValueSchema)
  .default({});

export const productCategoriesSchema = z
  .array(z.string().trim().min(1).max(240))
  .max(100)
  .default([])
  .transform((values) => [...new Set(values.map((value) => value.replace(/^\/|\/$/g, "")))].filter(Boolean));

export const productInputSchema = z.object({
  externalId: optionalNormalizedText(120),
  reference: optionalNormalizedText(120).transform((value) => value?.toUpperCase()),
  ean: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().regex(/^\d{8,14}$/, "Informe um EAN com 8 a 14 digitos.").optional(),
  ),
  name: z.string().trim().min(2, "Informe o nome do produto.").max(240),
  description: z.string().trim().max(10000).default(""),
  brand: z.string().trim().min(1, "Informe a marca.").max(120),
  salePrice: nullableMoney,
  cost: nullableMoney,
  categories: productCategoriesSchema,
  specifications: productSpecificationsSchema,
});

export const productIdSchema = z.string().uuid("Produto invalido.");

export const productListQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  visibility: z.enum(["ALL", "PUBLIC", "PRIVATE", "ARCHIVED"]).default("ALL"),
  brand: z.string().trim().max(120).default(""),
  categoryPath: z.string().trim().max(240).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

const queryValues = z.preprocess(
  (value) => value === undefined ? [] : Array.isArray(value) ? value : [value],
  z.array(z.string().trim().min(1).max(120)).max(20).default([]),
);

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  collection: z.string().trim().max(120).default(""),
  category: z.string().trim().max(160).default(""),
  color: queryValues,
  size: queryValues,
  fabric: queryValues,
  composition: queryValues,
  filling: queryValues,
  sleepPosition: queryValues,
  support: queryValues,
  pieceCount: queryValues,
  sort: z.enum(["RELEVANCE", "NAME_ASC", "NAME_DESC", "PRICE_ASC", "PRICE_DESC"]).default("RELEVANCE"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});

export const familyIdSchema = z.string().uuid("Familia invalida.");
export const collectionIdSchema = z.string().uuid("Colecao invalida.");

export const familyInputSchema = z.object({
  name: z.string().trim().min(2).max(240),
  description: z.string().trim().max(10000).default(""),
  brand: z.string().trim().min(1).max(120),
  reviewStatus: z.enum(["AUTO_APPROVED", "NEEDS_REVIEW", "REVIEWED"]),
  defaultProductId: productIdSchema.nullable(),
});

export const collectionInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(""),
  imageKey: z.string().trim().max(500).nullable(),
  sortOrder: z.coerce.number().int().min(0).max(1000),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  categoryIds: z.array(z.string().uuid()).max(120),
});

export const productVisibilitySchema = z.enum(["PUBLIC", "PRIVATE"]);

export const productImageUploadSchema = z.object({
  productId: productIdSchema,
  fileName: z.string().trim().min(1).max(240),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  sizeBytes: z.coerce.number().int().min(1).max(10 * 1024 * 1024),
});

export const productImageConfirmationSchema = z.object({
  productId: productIdSchema,
  objectKey: z.string().trim().min(1).max(500),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  sizeBytes: z.coerce.number().int().min(1).max(10 * 1024 * 1024),
  altText: z.string().trim().max(240).default(""),
  originalName: z.string().trim().min(1).max(240),
});

export const productImageReorderSchema = z.object({
  productId: productIdSchema,
  imageIds: z.array(z.string().uuid()).min(1).max(20),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type ProductImageUpload = z.infer<typeof productImageUploadSchema>;
