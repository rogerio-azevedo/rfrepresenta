import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { htmlToText } from "html-to-text";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BASE_URL = "https://www.altenburg.com.br";
export const PAGE_SIZE = 50;
export const MAX_CONCURRENCY = 4;
export const MAX_RETRIES = 4;
export const INITIAL_RETRY_DELAY_MS = 600;

export function cleanDescription(html) {
  if (!html || typeof html !== "string") {
    return "";
  }
  return htmlToText(html, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  }).trim();
}

export function extractPrice(item) {
  if (!item || !Array.isArray(item.sellers) || item.sellers.length === 0) {
    return null;
  }

  const defaultSeller =
    item.sellers.find((s) => s.sellerDefault === true) || item.sellers[0];

  const isValidOffer = (offer) => {
    return (
      Boolean(offer) &&
      offer.IsAvailable === true &&
      typeof offer.AvailableQuantity === "number" &&
      offer.AvailableQuantity > 0 &&
      typeof offer.Price === "number" &&
      !isNaN(offer.Price) &&
      offer.Price > 0
    );
  };

  if (isValidOffer(defaultSeller?.commertialOffer)) {
    return defaultSeller.commertialOffer.Price;
  }

  // Fallback: lowest available price among all sellers
  let lowestPrice = null;
  for (const seller of item.sellers) {
    const offer = seller?.commertialOffer;
    if (isValidOffer(offer)) {
      if (lowestPrice === null || offer.Price < lowestPrice) {
        lowestPrice = offer.Price;
      }
    }
  }

  return lowestPrice;
}

export function extractPhotos(item) {
  if (!item || !Array.isArray(item.images) || item.images.length === 0) {
    return [];
  }

  return item.images
    .map((img) => (img?.imageUrl ? String(img.imageUrl).trim() : ""))
    .filter((url) => url.length > 0)
    .map((url) => url.replace(/^http:\/\//i, "https://"));
}

export function extractPhoto(item) {
  const photos = extractPhotos(item);
  return photos.length > 0 ? photos[0] : null;
}

export function extractSpecifications(product) {
  const ignoredKeys = new Set([
    "descrição premium",
    "descrição premium faq",
    "informações buy box travesseiros",
    "certificação de teste externa",
    "tipo de condição da oferta",
    "grupo de envio de mercadorias",
    "nome do tema de variação",
    "meli_shipping_mode",
  ]);

  const specs = {};
  if (!Array.isArray(product?.allSpecifications)) {
    return specs;
  }

  for (const key of product.allSpecifications) {
    if (ignoredKeys.has(key.toLowerCase())) {
      continue;
    }
    const val = product[key];
    if (Array.isArray(val) && val.length > 0) {
      specs[key] = val.length === 1 ? val[0] : val;
    } else if (typeof val === "string" && val.trim()) {
      specs[key] = val.trim();
    }
  }

  return specs;
}

export function extractReference(product, item) {
  const refFromItem = item?.referenceId?.[0]?.Value;
  if (refFromItem && typeof refFromItem === "string" && refFromItem.trim()) {
    return refFromItem.trim();
  }

  const refFromProduct =
    product?.productReferenceCode || product?.productReference;
  if (
    refFromProduct &&
    typeof refFromProduct === "string" &&
    refFromProduct.trim()
  ) {
    return refFromProduct.trim();
  }

  return null;
}

export function transformSku(product, item) {
  const id = String(item.itemId || "").trim();
  const referencia = extractReference(product, item);
  const ean =
    item?.ean && String(item.ean).trim() ? String(item.ean).trim() : null;
  const name = String(
    item.nameComplete || item.name || product.productName || "",
  ).trim();
  const description = cleanDescription(product.description);
  const brand = product?.brand ? String(product.brand).trim() : "Altenburg";
  const categories = Array.isArray(product?.categories)
    ? product.categories.map((c) => String(c).replace(/^\/|\/$/g, ""))
    : [];
  const price = extractPrice(item);
  const photos = extractPhotos(item);
  const photo = photos.length > 0 ? photos[0] : null;
  const specifications = extractSpecifications(product);

  return {
    ID: id,
    REFERENCIA: referencia,
    EAN: ean,
    NOME: name,
    DESCRICAO: description,
    MARCA: brand,
    CATEGORIAS: categories,
    PRECO: price,
    FOTO: photo,
    FOTOS: photos,
    ESPECIFICACOES: specifications,
  };
}

export function extractCategoryLeaves(categories, parentPath = []) {
  const leaves = [];

  for (const cat of categories) {
    // Ignore VTEX root placeholder category
    if (cat.id === 1 && cat.name === "Category") {
      continue;
    }

    const currentPath = [...parentPath, cat.id];
    if (Array.isArray(cat.children) && cat.children.length > 0) {
      leaves.push(...extractCategoryLeaves(cat.children, currentPath));
    } else {
      leaves.push({
        id: cat.id,
        name: cat.name,
        path: currentPath.join("/"),
      });
    }
  }

  return leaves;
}

export async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  let attempt = 0;
  let delay = INITIAL_RETRY_DELAY_MS;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: "application/json",
          "User-Agent": "AltenburgCatalogSync/1.0",
          ...(options.headers || {}),
        },
      });

      if (response.ok) {
        return response;
      }

      // Retry on rate limit (429) or transient server errors (5xx)
      if (
        response.status === 429 ||
        (response.status >= 500 && response.status <= 599)
      ) {
        attempt++;
        if (attempt > retries) {
          throw new Error(
            `HTTP ${response.status} (${response.statusText}) after ${retries} retries: ${url}`,
          );
        }
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        continue;
      }

      throw new Error(
        `HTTP ${response.status} (${response.statusText}): ${url}`,
      );
    } catch (err) {
      if (attempt < retries) {
        attempt++;
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

export function validateRecord(record, index) {
  const requiredKeys = [
    "ID",
    "REFERENCIA",
    "EAN",
    "NOME",
    "DESCRICAO",
    "MARCA",
    "CATEGORIAS",
    "PRECO",
    "FOTO",
    "FOTOS",
    "ESPECIFICACOES",
  ];
  const actualKeys = Object.keys(record);

  if (
    actualKeys.length !== requiredKeys.length ||
    !requiredKeys.every((k) => k in record)
  ) {
    throw new Error(
      `Registro #${index} possui chaves inválidas: ${JSON.stringify(actualKeys)}`,
    );
  }

  if (typeof record.ID !== "string" || record.ID.trim().length === 0) {
    throw new Error(`Registro #${index} tem ID inválido: ${record.ID}`);
  }

  if (record.REFERENCIA !== null && typeof record.REFERENCIA !== "string") {
    throw new Error(
      `Registro #${index} tem REFERENCIA inválida: ${record.REFERENCIA}`,
    );
  }

  if (record.EAN !== null && typeof record.EAN !== "string") {
    throw new Error(`Registro #${index} tem EAN inválido: ${record.EAN}`);
  }

  if (typeof record.NOME !== "string" || record.NOME.trim().length === 0) {
    throw new Error(`Registro #${index} tem NOME inválido: ${record.NOME}`);
  }

  if (typeof record.DESCRICAO !== "string") {
    throw new Error(
      `Registro #${index} tem DESCRICAO inválida: ${typeof record.DESCRICAO}`,
    );
  }

  if (typeof record.MARCA !== "string" || record.MARCA.trim().length === 0) {
    throw new Error(`Registro #${index} tem MARCA inválida: ${record.MARCA}`);
  }

  if (!Array.isArray(record.CATEGORIAS)) {
    throw new Error(
      `Registro #${index} tem CATEGORIAS inválidas: ${typeof record.CATEGORIAS}`,
    );
  }

  if (
    record.PRECO !== null &&
    (typeof record.PRECO !== "number" ||
      isNaN(record.PRECO) ||
      record.PRECO < 0)
  ) {
    throw new Error(`Registro #${index} tem PRECO inválido: ${record.PRECO}`);
  }

  if (
    record.FOTO !== null &&
    (typeof record.FOTO !== "string" || !record.FOTO.startsWith("https://"))
  ) {
    throw new Error(`Registro #${index} tem FOTO inválida: ${record.FOTO}`);
  }

  if (
    !Array.isArray(record.FOTOS) ||
    !record.FOTOS.every(
      (u) => typeof u === "string" && u.startsWith("https://"),
    )
  ) {
    throw new Error(`Registro #${index} tem FOTOS inválidas: ${record.FOTOS}`);
  }

  if (
    typeof record.ESPECIFICACOES !== "object" ||
    record.ESPECIFICACOES === null ||
    Array.isArray(record.ESPECIFICACOES)
  ) {
    throw new Error(
      `Registro #${index} tem ESPECIFICACOES inválidas: ${typeof record.ESPECIFICACOES}`,
    );
  }
}

async function runQueue(items, workerFn, concurrency = MAX_CONCURRENCY) {
  const results = [];
  let index = 0;

  async function next() {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      const res = await workerFn(item, currentIndex);
      results[currentIndex] = res;
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => next(),
  );
  await Promise.all(workers);
  return results;
}

export async function syncAltenburgCatalog({
  outputFile = path.resolve(__dirname, "../data/altenburg-products.json"),
  baseUrl = BASE_URL,
  concurrency = MAX_CONCURRENCY,
  log = console.log,
} = {}) {
  const startTime = Date.now();
  log(`[Catalog Sync] Iniciando sincronização do catálogo Altenburg...`);
  log(`[Catalog Sync] Base URL: ${baseUrl}`);

  // 1. Obter árvore de categorias
  const treeUrl = `${baseUrl}/api/catalog_system/pub/category/tree/10`;
  log(`[Catalog Sync] Consultando árvore de categorias em ${treeUrl}...`);
  const treeRes = await fetchWithRetry(treeUrl);
  const categoriesTree = await treeRes.json();

  if (!Array.isArray(categoriesTree) || categoriesTree.length === 0) {
    throw new Error("Árvore de categorias vazia ou formato inválido recebido.");
  }

  const leaves = extractCategoryLeaves(categoriesTree);
  log(
    `[Catalog Sync] Encontradas ${leaves.length} categorias terminais para consulta.`,
  );

  const skuMap = new Map();
  let totalCategoriesProcessed = 0;
  let totalProductsFetched = 0;

  // 2. Processar cada categoria terminal
  await runQueue(
    leaves,
    async (leaf) => {
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const to = from + PAGE_SIZE - 1;
        const searchUrl = `${baseUrl}/api/catalog_system/pub/products/search/?fq=C:${leaf.path}/&_from=${from}&_to=${to}`;

        const res = await fetchWithRetry(searchUrl);
        const products = await res.json();

        if (!Array.isArray(products) || products.length === 0) {
          hasMore = false;
          break;
        }

        totalProductsFetched += products.length;

        for (const product of products) {
          if (!Array.isArray(product.items)) continue;
          for (const item of product.items) {
            const skuRecord = transformSku(product, item);
            if (skuRecord.ID) {
              skuMap.set(skuRecord.ID, skuRecord);
            }
          }
        }

        if (products.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
          if (from >= 2500) {
            log(
              `[Catalog Sync] AVISO: Categoria ${leaf.name} (${leaf.path}) atingiu o limite de paginação VTEX (2500).`,
            );
            hasMore = false;
          }
        }
      }

      totalCategoriesProcessed++;
      if (
        totalCategoriesProcessed % 10 === 0 ||
        totalCategoriesProcessed === leaves.length
      ) {
        log(
          `[Catalog Sync] Progresso: ${totalCategoriesProcessed}/${leaves.length} categorias processadas. SKUs únicos até agora: ${skuMap.size}`,
        );
      }
    },
    concurrency,
  );

  if (skuMap.size === 0) {
    throw new Error(
      "Nenhum SKU foi coletado. A sincronização falhou e o arquivo anterior não será alterado.",
    );
  }

  log(
    `[Catalog Sync] Coleta concluída! Total de SKUs únicos coletados: ${skuMap.size}. Total de produtos iterados: ${totalProductsFetched}.`,
  );

  // 3. Ordenar por ID determinístico
  const records = Array.from(skuMap.values()).sort((a, b) =>
    a.ID.localeCompare(b.ID, undefined, { numeric: true }),
  );

  // 4. Validar todos os registros
  log(
    `[Catalog Sync] Validando conformidade dos ${records.length} registros...`,
  );
  records.forEach((record, index) => validateRecord(record, index));

  const pricedCount = records.filter((r) => r.PRECO !== null).length;
  const outOfStockCount = records.filter((r) => r.PRECO === null).length;
  const withPhotoCount = records.filter((r) => r.FOTO !== null).length;

  log(`[Catalog Sync] Estatísticas da coleta:`);
  log(`  - Total SKUs: ${records.length}`);
  log(`  - Com preço e estoque: ${pricedCount}`);
  log(`  - Sem preço / sem estoque: ${outOfStockCount}`);
  log(`  - Com foto: ${withPhotoCount}`);

  // 5. Escrita atômica em arquivo temporário e rename
  const outputDir = path.dirname(outputFile);
  await fs.mkdir(outputDir, { recursive: true });

  const tempFile = `${outputFile}.tmp.${Date.now()}`;
  const jsonContent = JSON.stringify(records, null, 2);

  await fs.writeFile(tempFile, jsonContent, "utf-8");
  await fs.rename(tempFile, outputFile);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  log(
    `[Catalog Sync] Catálogo salvo com sucesso em ${outputFile} (${(jsonContent.length / 1024 / 1024).toFixed(2)} MB) em ${durationSec}s.`,
  );

  return {
    totalSkus: records.length,
    pricedCount,
    outOfStockCount,
    withPhotoCount,
    outputFile,
  };
}

// Se executado diretamente via CLI
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename)
) {
  syncAltenburgCatalog()
    .then(() => {
      console.log("[Catalog Sync] Processo finalizado com sucesso.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Catalog Sync] ERRO FATAL:", err);
      process.exit(1);
    });
}
