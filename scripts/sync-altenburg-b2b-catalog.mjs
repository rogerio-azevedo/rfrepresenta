import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { htmlToText } from "html-to-text";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const B2B_BASE_URL = "https://catalogo.altenburg.com.br";
export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY_MS = 600;

export function slugToTitle(slug) {
  const customTitles = {
    "cetim-sublime-300": "Cetim Sublime 300 Fios",
    "bordados-em-cetim-300-fios": "Bordados em Cetim 300 Fios",
    "algodao-lux-200-fios": "Algodão Lux 200 Fios",
    "blend-elegance": "Blend Elegance",
    "blend-malha": "Blend Malha",
    "blend-comfort": "Blend Comfort",
    "blend-sense": "Blend Sense",
    cobertor: "Cobertores",
    "mundo-kids": "Mundo Kids",
    "malha-fio-penteado": "Malha Fio Penteado 100% Algodão",
    "toque-acetinado": "Toque Acetinado",
    "toque-acetinado-ultrawave": "Toque Acetinado Ultrawave",
    "toque-acetinado-ultrawave-ne": "Toque Acetinado Ultrawave (Nordeste)",
    "bom-sono": "Bom Sono",
    travesseiros: "Travesseiros",
    protetores: "Protetores de Colchão e Travesseiro",
    "saia-box": "Saia Box",
    banho: "Banho",
    "banho-ne": "Banho (Nordeste)",
    "linha-decor": "Linha Décor",
    acessorios: "Acessórios de Cama",
    almofadas: "Almofadas & Rolinhos",
  };

  if (customTitles[slug]) return customTitles[slug];

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function parseInfoContent(infoHtml, groupTitle = "") {
  const text = htmlToText(infoHtml, { wordwrap: false });
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let padrao = null;
  let multiplo = null;
  let previsao = null;
  const detalhes = [];
  const items = [];
  let currentTipo = "PRODUTO";

  const tipoKeywords = [
    "EDREDOM",
    "JOGO DE EDREDOM",
    "JOGO DE COLCHA",
    "ROUPA DE CAMA COMPLETO",
    "ROUPA DE CAMA SIMPLES",
    "ROUPA DE CAMA",
    "PORTA TRAVESSEIRO",
    "COLCHA",
    "TRAVESSEIRO",
    "PROTETOR DE TRAVESSEIRO",
    "PROTETOR DE COLCHÃO",
    "PROTETOR",
    "BANHÃO",
    "BANHO",
    "ROSTO",
    "PISO",
    "MANTA",
    "PESEIRA",
    "CAPA DE ALMOFADA",
    "ALMOFADA",
    "SAIA BOX",
    "PILLOW TOP",
    "DUVET",
    "ENCHIMENTO DE DUVET",
    "ENCHIMENTO",
  ];

  for (const line of lines) {
    if (/^Padr[aã]o\s*:/i.test(line)) {
      padrao = line.replace(/^Padr[aã]o\s*:\s*/i, "").trim();
      continue;
    }
    if (/^M[uú]ltiplo\s*(de|\:)/i.test(line)) {
      multiplo = line.trim();
      continue;
    }
    if (/^A\s+PARTIR\s+DE/i.test(line)) {
      previsao = line.trim();
      continue;
    }

    // Check if line matches a product type header
    const matchedTipo = tipoKeywords.find((kw) => {
      const regex = new RegExp(`^${kw}\\b`, "i");
      return regex.test(line);
    });

    if (matchedTipo && line.length < 40 && !/\d{10,14}/.test(line)) {
      currentTipo = line.trim();
      continue;
    }

    // Check if line contains a reference code
    const refMatch = line.match(
      /\b(0\d{13}|\d{12,14}|9\d{11,13}|1\d{11,13}|01\d{9,11})\b/,
    );
    if (refMatch) {
      const ref = refMatch[1];
      const rest = line.replace(ref, "").trim();
      let tamanho = "Padrão";

      if (/Solteiro\s*King/i.test(rest)) tamanho = "Solteiro King";
      else if (/Super\s*King/i.test(rest)) tamanho = "Super King";
      else if (/Solteiro/i.test(rest)) tamanho = "Solteiro";
      else if (/Casal/i.test(rest)) tamanho = "Casal";
      else if (/Queen/i.test(rest)) tamanho = "Queen";
      else if (/King/i.test(rest)) tamanho = "King";
      else if (/Berço/i.test(rest)) tamanho = "Berço";
      else if (/Body\s*Pillow/i.test(rest)) tamanho = "Body Pillow";
      else if (/Banhão/i.test(rest)) tamanho = "Banhão";
      else if (/Banho/i.test(rest)) tamanho = "Banho";
      else if (/Rosto/i.test(rest)) tamanho = "Rosto";

      let medida = rest;
      if (tamanho !== "Padrão") {
        medida = rest.replace(new RegExp(`\\b${tamanho}\\b`, "i"), "").trim();
      }

      items.push({
        tipo: currentTipo,
        referencia: ref,
        medida: medida.replace(/^[\s\-\/]+|[\s\-\/]+$/g, "") || rest,
        tamanho,
        raw: line,
      });
      continue;
    }

    const cleanLower = line.toLowerCase();
    if (
      cleanLower.includes("traço") ||
      cleanLower.includes("trao") ||
      cleanLower.includes("download [") ||
      cleanLower.startsWith("referência") ||
      cleanLower === groupTitle.toLowerCase()
    ) {
      continue;
    }

    detalhes.push(line);
  }

  return { padrao, multiplo, previsao, detalhes, items };
}

export function parseCollectionHtml(html, slug, baseUrl = B2B_BASE_URL) {
  // 1. Banner
  const topoMatch = html.match(/<div id="topo"[^>]*>([\s\S]*?)<\/div>/i);
  const bannerMatch = topoMatch ? topoMatch[1].match(/src="([^"]+)"/i) : null;
  const bannerUrl = bannerMatch ? new URL(bannerMatch[1], baseUrl).href : null;

  // 2. Collection header description / technical specs
  const descriGeralMatch = html.match(
    /<div id="fundo">([\s\S]*?)(?:<div class="barra"|<div class="fotos"|<br class="both" \/>\s*<div class="info">)/i,
  );
  const descriGeral = descriGeralMatch
    ? htmlToText(descriGeralMatch[1], { wordwrap: false }).trim()
    : "";

  // 3. Product Blocks
  const groups = [];
  const parts = html.split(/<div class="fotos">/i);

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // Photo extraction
    const fotoMatch =
      part.match(/class="foto-produto"[^>]*src="([^"]+)"/i) ||
      part.match(/src="([^"]*admin\/foto\.php[^"]*)"/i);
    const foto = fotoMatch ? new URL(fotoMatch[1], baseUrl).href : null;

    // Info block extraction
    const infoMatch =
      part.match(/<div class="info">([\s\S]*?)<\/div>\s*<\/div>/i) ||
      part.match(/<div class="info">([\s\S]*)/i);
    const infoHtml = infoMatch ? infoMatch[1] : "";

    // Title inside h1
    const titleMatch = infoHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch
      ? htmlToText(titleMatch[1], { wordwrap: false }).trim()
      : `Item #${i}`;

    // Download URL for marketing assets
    const downloadMatch =
      infoHtml.match(/href="([^"]*\/catalog\/\?arq=[^"]*)"/i) ||
      infoHtml.match(/href="([^"]*admin\/arquivos_enviados\/[^"]*)"/i);
    const downloadUrl = downloadMatch
      ? new URL(downloadMatch[1], baseUrl).href
      : null;

    const parsedInfo = parseInfoContent(infoHtml, title);

    groups.push({
      id: `${slug}-${i}`,
      name: title,
      foto,
      downloadUrl,
      padrao: parsedInfo.padrao,
      multiplo: parsedInfo.multiplo,
      previsao: parsedInfo.previsao,
      detalhes: parsedInfo.detalhes,
      itens: parsedInfo.items,
    });
  }

  return {
    slug,
    name: slugToTitle(slug),
    banner: bannerUrl,
    description: descriGeral,
    groupsCount: groups.length,
    groups,
  };
}

export async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  let attempt = 0;
  let delay = INITIAL_RETRY_DELAY_MS;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "AltenburgB2BCatalogSync/1.0",
          ...(options.headers || {}),
        },
      });

      if (response.ok) {
        return response;
      }

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
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      throw new Error(
        `HTTP ${response.status} (${response.statusText}): ${url}`,
      );
    } catch (err) {
      if (attempt < retries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

export async function syncAltenburgB2BCatalog({
  outputFile = path.resolve(
    __dirname,
    "../data/altenburg-b2b-collections.json",
  ),
  vtexProductsFile = path.resolve(__dirname, "../data/altenburg-products.json"),
  baseUrl = B2B_BASE_URL,
  log = console.log,
} = {}) {
  const startTime = Date.now();
  log(
    `[B2B Catalog Sync] Iniciando extração do catálogo oficial B2B (${baseUrl})...`,
  );

  // 1. Carregar produtos existentes da VTEX para enriquecer as referências
  const vtexRefMap = new Map();
  try {
    const rawVtex = await fs.readFile(vtexProductsFile, "utf-8");
    const vtexProducts = JSON.parse(rawVtex);
    for (const p of vtexProducts) {
      if (p.REFERENCIA) {
        const cleanRef = p.REFERENCIA.split("-")[0].trim();
        vtexRefMap.set(cleanRef, p);
        vtexRefMap.set(p.REFERENCIA.trim(), p);
      }
    }
    log(
      `[B2B Catalog Sync] Base de produtos VTEX carregada: ${vtexProducts.length} produtos (${vtexRefMap.size} referências mapeadas).`,
    );
  } catch (err) {
    log(
      `[B2B Catalog Sync] AVISO: Não foi possível carregar a base VTEX (${err.message}). Prosseguindo sem vínculo de preços.`,
    );
  }

  // 2. Obter lista de coleções da home do catálogo B2B
  const homeRes = await fetchWithRetry(baseUrl);
  const homeHtml = await homeRes.text();

  const matches = [
    ...homeHtml.matchAll(
      /<li><a href="https:\/\/catalogo\.altenburg\.com\.br\/([^"]+)"/g,
    ),
  ];
  const slugs = matches.map((m) => m[1]);

  if (slugs.length === 0) {
    throw new Error("Nenhuma coleção foi encontrada no menu do catálogo B2B.");
  }

  log(
    `[B2B Catalog Sync] Identificadas ${slugs.length} coleções oficiais no catálogo B2B.`,
  );

  // 3. Processar cada coleção
  const collections = [];
  let totalGroups = 0;
  let totalItems = 0;
  let totalMatchedVtex = 0;

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    log(`[B2B Catalog Sync] [${i + 1}/${slugs.length}] Extraindo ${slug}...`);

    const colRes = await fetchWithRetry(`${baseUrl}/${slug}`);
    const colHtml = await colRes.text();

    const collection = parseCollectionHtml(colHtml, slug, baseUrl);

    // Enriquecer itens com dados da base VTEX quando disponível
    for (const group of collection.groups) {
      for (const item of group.itens) {
        totalItems++;
        const matched = vtexRefMap.get(item.referencia);
        if (matched) {
          totalMatchedVtex++;
          item.vtexSku = {
            id: matched.ID,
            nome: matched.NOME,
            preco: matched.PRECO,
            ean: matched.EAN,
            fotoPrincipal: matched.FOTO,
            fotos: matched.FOTOS,
            especificacoes: matched.ESPECIFICACOES,
          };
        } else {
          item.vtexSku = null;
        }
      }
    }

    totalGroups += collection.groups.length;
    collections.push(collection);
  }

  log(`[B2B Catalog Sync] Extração concluída!`);
  log(`  - Coleções processadas: ${collections.length}`);
  log(`  - Grupos/Estampas encontrados: ${totalGroups}`);
  log(`  - Variações/Itens de tamanho: ${totalItems}`);
  log(
    `  - Itens enriquecidos com dados VTEX (preço/EAN/galeria): ${totalMatchedVtex}`,
  );

  // 4. Salvar arquivo JSON
  const outputDir = path.dirname(outputFile);
  await fs.mkdir(outputDir, { recursive: true });

  const tempFile = `${outputFile}.tmp.${Date.now()}`;
  const jsonContent = JSON.stringify(collections, null, 2);

  await fs.writeFile(tempFile, jsonContent, "utf-8");
  await fs.rename(tempFile, outputFile);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  log(
    `[B2B Catalog Sync] Arquivo salvo em ${outputFile} (${(jsonContent.length / 1024 / 1024).toFixed(2)} MB) em ${durationSec}s.`,
  );

  return {
    collectionsCount: collections.length,
    totalGroups,
    totalItems,
    totalMatchedVtex,
    outputFile,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename)
) {
  syncAltenburgB2BCatalog()
    .then(() => {
      console.log("[B2B Catalog Sync] Processo finalizado com sucesso.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[B2B Catalog Sync] ERRO FATAL:", err);
      process.exit(1);
    });
}
