"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  archiveProduct,
  bulkSetProductVisibility,
  confirmProductImage,
  createProductRecord,
  getAdminProduct,
  listR2DeletionQueue,
  markR2DeletionAttempt,
  removeProductImage,
  removeR2DeletionQueueItem,
  reorderProductImages,
  restoreProduct,
  setProductVisibility,
  updateProductRecord,
} from "@/server/dal/products";
import { productIdSchema, productImageConfirmationSchema, productImageReorderSchema, productImageUploadSchema, productInputSchema } from "@/schemas/products";
import { createR2PutUrl, deleteR2Object, headR2Object } from "@/server/catalog/r2";
import type { FormActionState } from "./types";

export type ProductActionState = FormActionState & { productId?: string; upload?: { url: string; objectKey: string } };

function readJsonField<T>(formData: FormData, key: string, fallback: T): T {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readProductInput(formData: FormData) {
  return {
    externalId: formData.get("externalId"),
    reference: formData.get("reference"),
    ean: formData.get("ean"),
    name: formData.get("name"),
    description: formData.get("description"),
    brand: formData.get("brand"),
    salePrice: formData.get("salePrice"),
    cost: formData.get("cost"),
    categories: readJsonField(formData, "categories", []),
    specifications: readJsonField(formData, "specifications", {}),
  };
}

function validationState(error: z.ZodError): ProductActionState {
  return { status: "error", errors: error.flatten().fieldErrors as Record<string, string[] | undefined> };
}

function databaseErrorState(error: unknown): ProductActionState {
  const postgresError = error as { code?: string; constraint?: string };
  if (postgresError.code === "23505") {
    if (postgresError.constraint?.includes("reference")) return { status: "error", errors: { reference: ["Esta referencia ja esta cadastrada."] } };
    if (postgresError.constraint?.includes("ean")) return { status: "error", errors: { ean: ["Este EAN ja esta cadastrado."] } };
    if (postgresError.constraint?.includes("external_id")) return { status: "error", errors: { externalId: ["Este ID externo ja esta cadastrado."] } };
  }
  return { status: "error", message: error instanceof Error ? error.message : "Nao foi possivel salvar o produto." };
}

export async function createProductAction(_previousState: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const parsed = productInputSchema.safeParse(readProductInput(formData));
  if (!parsed.success) return validationState(parsed.error);
  try {
    const product = await createProductRecord(parsed.data);
    revalidatePath("/admin/produtos");
    return { status: "success", message: "Produto criado como privado.", productId: product.id };
  } catch (error) {
    return databaseErrorState(error);
  }
}

export async function updateProductAction(productId: string, _previousState: FormActionState, formData: FormData): Promise<FormActionState> {
  const id = productIdSchema.safeParse(productId);
  const parsed = productInputSchema.safeParse(readProductInput(formData));
  if (!id.success) return { status: "error", message: "Produto invalido." };
  if (!parsed.success) return validationState(parsed.error);
  try {
    await updateProductRecord(id.data, parsed.data);
    revalidatePath("/admin/produtos");
    revalidatePath(`/admin/produtos/${id.data}`);
    return { status: "success", message: "Produto atualizado." };
  } catch (error) {
    return databaseErrorState(error);
  }
}

export async function setProductVisibilityAction(productId: string, isPublic: boolean) {
  const id = productIdSchema.parse(productId);
  await setProductVisibility(id, isPublic);
  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${id}`);
  revalidatePath("/catalogo");
}

export async function bulkSetProductVisibilityAction(productIds: string[], isPublic: boolean) {
  const ids = z.array(productIdSchema).min(1).max(100).parse(productIds);
  const result = await bulkSetProductVisibility(ids, isPublic);
  revalidatePath("/admin/produtos");
  revalidatePath("/catalogo");
  return result;
}

export async function archiveProductAction(productId: string) {
  const id = productIdSchema.parse(productId);
  await archiveProduct(id);
  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${id}`);
  revalidatePath("/catalogo");
}

export async function restoreProductAction(productId: string) {
  const id = productIdSchema.parse(productId);
  await restoreProduct(id);
  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${id}`);
}

export async function requestProductImageUploadAction(input: unknown): Promise<ProductActionState> {
  const parsed = productImageUploadSchema.safeParse(input);
  if (!parsed.success) return validationState(parsed.error);
  const product = await getAdminProduct(parsed.data.productId);
  if (product.deletedAt) return { status: "error", message: "Restaure o produto antes de enviar imagens." };
  const extension = parsed.data.contentType.split("/")[1].replace("jpeg", "jpg");
  const objectKey = `products/${parsed.data.productId}/${crypto.randomUUID()}.${extension}`;
  const url = await createR2PutUrl(objectKey, parsed.data.contentType);
  return { status: "success", upload: { url, objectKey } };
}

export async function confirmProductImageAction(input: unknown): Promise<ProductActionState> {
  const parsed = productImageConfirmationSchema.safeParse(input);
  if (!parsed.success) return validationState(parsed.error);
  if (!parsed.data.objectKey.startsWith(`products/${parsed.data.productId}/`)) return { status: "error", message: "Objeto de imagem invalido." };
  try {
    const head = await headR2Object(parsed.data.objectKey);
    if (head.ContentLength !== parsed.data.sizeBytes || head.ContentType !== parsed.data.contentType) {
      await deleteR2Object(parsed.data.objectKey);
      return { status: "error", message: "O arquivo enviado nao corresponde aos metadados informados." };
    }
    await confirmProductImage(parsed.data.productId, {
      objectKey: parsed.data.objectKey,
      originalName: parsed.data.originalName,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
      altText: parsed.data.altText,
    });
    revalidatePath(`/admin/produtos/${parsed.data.productId}`);
    return { status: "success", message: "Imagem adicionada." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Nao foi possivel confirmar a imagem." };
  }
}

export async function removeProductImageAction(productId: string, imageId: string) {
  const image = await removeProductImage(productId, imageId);
  try {
    await deleteR2Object(image.objectKey);
    await removeR2DeletionQueueItem(image.objectKey);
  } catch (error) {
    await markR2DeletionAttempt(image.objectKey, error);
  }
  revalidatePath(`/admin/produtos/${productId}`);
}

export async function reorderProductImagesAction(input: unknown) {
  const parsed = productImageReorderSchema.parse(input);
  await reorderProductImages(parsed.productId, parsed.imageIds);
  revalidatePath(`/admin/produtos/${parsed.productId}`);
}

export async function cleanupR2ObjectsAction() {
  const queue = await listR2DeletionQueue();
  const result = { removed: 0, failed: 0 };
  for (const item of queue) {
    try {
      await deleteR2Object(item.objectKey);
      await removeR2DeletionQueueItem(item.objectKey);
      result.removed++;
    } catch (error) {
      await markR2DeletionAttempt(item.objectKey, error);
      result.failed++;
    }
  }
  return result;
}
