"use server";

import { parse } from "csv-parse/sync";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  applyCommercialPriceRows,
  mergeFamilyRecords,
  saveCollectionRecord,
  splitFamilyRecord,
  updateFamilyRecord,
  type CommercialPriceRow,
} from "@/server/dal/catalog-admin";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { inArray, or } from "drizzle-orm";
import { collectionIdSchema, collectionInputSchema, familyIdSchema, familyInputSchema, productIdSchema, productListQuerySchema } from "@/schemas/products";
import { bulkSetFilteredProductVisibility } from "@/server/dal/products";
import { normalizeKey } from "@/server/catalog/normalization";
import { requireAdminContext } from "@/server/auth/context";
import { createR2PutUrl, deleteR2Object, getR2ObjectUrl, headR2Object } from "@/server/catalog/r2";
import type { FormActionState } from "./types";

function readJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function refreshCatalog() {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/admin/produtos");
  revalidatePath("/admin/produtos/familias");
  revalidatePath("/admin/produtos/colecoes");
}

export async function updateFamilyAction(familyId: string, _state: FormActionState, formData: FormData): Promise<FormActionState> {
  const id = familyIdSchema.safeParse(familyId);
  const parsed = familyInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    brand: formData.get("brand"),
    reviewStatus: formData.get("reviewStatus"),
    defaultProductId: formData.get("defaultProductId") || null,
  });
  if (!id.success || !parsed.success) return { status: "error", message: "Revise os dados da familia." };
  try {
    await updateFamilyRecord(id.data, parsed.data);
    refreshCatalog();
    revalidatePath(`/admin/produtos/familias/${id.data}`);
    return { status: "success", message: "Familia atualizada." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao atualizar a familia." };
  }
}

export async function mergeFamilyAction(sourceFamilyId: string, formData: FormData) {
  const source = familyIdSchema.parse(sourceFamilyId);
  const target = familyIdSchema.parse(formData.get("targetFamilyId"));
  await mergeFamilyRecords(source, target);
  refreshCatalog();
}

export async function splitFamilyAction(sourceFamilyId: string, formData: FormData) {
  const source = familyIdSchema.parse(sourceFamilyId);
  const productIds = z.array(productIdSchema).min(1).parse(readJson(formData.get("productIds"), []));
  const name = z.string().trim().min(2).max(240).parse(formData.get("newFamilyName"));
  await splitFamilyRecord(source, productIds, name);
  refreshCatalog();
}

export async function saveCollectionAction(collectionId: string | null, _state: FormActionState, formData: FormData): Promise<FormActionState> {
  const id = collectionId ? collectionIdSchema.safeParse(collectionId) : null;
  if (id && !id.success) return { status: "error", message: "Colecao invalida." };
  const parsed = collectionInputSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    imageKey: formData.get("imageKey") || null,
    sortOrder: formData.get("sortOrder"),
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") === "on",
    categoryIds: readJson(formData.get("categoryIds"), []),
  });
  if (!parsed.success) return { status: "error", message: "Revise os dados da colecao.", errors: parsed.error.flatten().fieldErrors };
  try {
    const collection = await saveCollectionRecord(id?.data ?? null, parsed.data);
    refreshCatalog();
    revalidatePath(`/admin/produtos/colecoes/${collection.id}`);
    return { status: "success", message: "Colecao salva." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao salvar a colecao." };
  }
}

export async function setFilteredProductVisibilityAction(rawQuery: unknown, isPublic: boolean) {
  const query = productListQuerySchema.parse(rawQuery);
  const updated = await bulkSetFilteredProductVisibility(query, isPublic);
  refreshCatalog();
  return { updated };
}

const collectionCoverFileSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  sizeBytes: z.coerce.number().int().min(1).max(10 * 1024 * 1024),
});

const collectionCoverConfirmationSchema = collectionCoverFileSchema.extend({
  objectKey: z.string().trim().regex(/^collections\/[0-9a-f-]+\.(?:jpg|png|webp|avif)$/),
});

export type CollectionCoverUploadState = FormActionState & {
  upload?: { url: string; objectKey: string; publicUrl: string };
};

export async function requestCollectionCoverUploadAction(input: unknown): Promise<CollectionCoverUploadState> {
  await requireAdminContext();
  const parsed = collectionCoverFileSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Selecione uma imagem valida de ate 10 MB." };
  const extension = parsed.data.contentType.split("/")[1].replace("jpeg", "jpg");
  const objectKey = `collections/${crypto.randomUUID()}.${extension}`;
  return {
    status: "success",
    upload: {
      url: await createR2PutUrl(objectKey, parsed.data.contentType),
      objectKey,
      publicUrl: getR2ObjectUrl(objectKey),
    },
  };
}

export async function confirmCollectionCoverUploadAction(input: unknown): Promise<FormActionState> {
  await requireAdminContext();
  const parsed = collectionCoverConfirmationSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Dados da capa invalidos." };
  try {
    const head = await headR2Object(parsed.data.objectKey);
    if (head.ContentLength !== parsed.data.sizeBytes || head.ContentType !== parsed.data.contentType) {
      await deleteR2Object(parsed.data.objectKey);
      return { status: "error", message: "O arquivo enviado nao corresponde aos metadados informados." };
    }
    return { status: "success" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Nao foi possivel confirmar a capa." };
  }
}

const priceNumber = z.preprocess((value) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const raw = String(value).trim();
  return Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
}, z.number().finite().min(0).max(9999999999.99).nullable());

function parsePriceCsv(file: File): Promise<{ rows: CommercialPriceRow[]; errors: string[] }> {
  return file.text().then((content) => {
    const records = parse(content, { columns: (headers: string[]) => headers.map((header) => normalizeKey(header).replace(/ /g, "_")), skip_empty_lines: true, trim: true, bom: true }) as Record<string, string>[];
    const rows: CommercialPriceRow[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    records.forEach((record, index) => {
      const reference = record.referencia?.trim().toUpperCase() || undefined;
      const ean = record.ean?.trim() || undefined;
      const salePrice = priceNumber.safeParse(record.preco_comercial);
      const cost = priceNumber.safeParse(record.custo);
      const key = reference ? `r:${reference}` : ean ? `e:${ean}` : "";
      if (!key || !salePrice.success || !cost.success) {
        errors.push(`Linha ${index + 2}: informe referencia/EAN e valores validos.`);
        return;
      }
      if (seen.has(key)) {
        errors.push(`Linha ${index + 2}: produto duplicado no arquivo.`);
        return;
      }
      seen.add(key);
      rows.push({ reference, ean, salePrice: salePrice.data, cost: record.custo?.trim() ? cost.data : undefined });
    });
    return { rows, errors };
  });
}

export type PriceImportState = FormActionState & { report?: { rows: number; matched: number; missing: string[] } };

async function priceImportReport(file: File) {
  await requireAdminContext();
  if (file.size > 5 * 1024 * 1024) throw new Error("O CSV deve ter no maximo 5 MB.");
  const parsed = await parsePriceCsv(file);
  if (parsed.errors.length) throw new Error(parsed.errors.slice(0, 10).join("\n"));
  const references = parsed.rows.flatMap((row) => row.reference ? [row.reference] : []);
  const eans = parsed.rows.flatMap((row) => row.ean ? [row.ean] : []);
  const conditions = [];
  if (references.length) conditions.push(inArray(products.reference, references));
  if (eans.length) conditions.push(inArray(products.ean, eans));
  const matches = conditions.length ? await db.select({ reference: products.reference, ean: products.ean }).from(products).where(or(...conditions)) : [];
  const found = new Set(matches.flatMap((row) => [row.reference ? `r:${row.reference}` : "", row.ean ? `e:${row.ean}` : ""]).filter(Boolean));
  const missing = parsed.rows.filter((row) => !found.has(row.reference ? `r:${row.reference}` : `e:${row.ean}`)).map((row) => row.reference ?? row.ean ?? "");
  return { parsed, report: { rows: parsed.rows.length, matched: parsed.rows.length - missing.length, missing } };
}

export async function validatePriceCsvAction(_state: PriceImportState, formData: FormData): Promise<PriceImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { status: "error", message: "Selecione um arquivo CSV." };
  try {
    const { report } = await priceImportReport(file);
    return { status: "success", message: "Arquivo validado. Nenhum dado foi alterado.", report };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "CSV invalido." };
  }
}

export async function applyPriceCsvAction(_state: PriceImportState, formData: FormData): Promise<PriceImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { status: "error", message: "Selecione um arquivo CSV." };
  try {
    const { parsed, report } = await priceImportReport(file);
    if (report.missing.length) return { status: "error", message: "O arquivo possui produtos nao encontrados.", report };
    const updated = await applyCommercialPriceRows(parsed.rows);
    refreshCatalog();
    return { status: "success", message: `${updated} preco(s) atualizado(s).`, report };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao importar a tabela." };
  }
}
