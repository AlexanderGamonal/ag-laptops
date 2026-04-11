import { extractSpecs, normalizeText } from "@/lib/spec-extractor";

export const IGV_RATE = 0.18;
export const COMMISSION_RATE = 0.99;

type PriceableProduct = {
  descripcion?: string | null;
  marca?: string | null;
};

function isLaptopProduct(product?: PriceableProduct): boolean {
  const description = product?.descripcion || "";
  const normalized = normalizeText(description);

  if (!normalized) return true;

  if (
    /\b(ipad|tablet|airpods|watch|iphone|pencil|earbuds|speaker)\b/.test(
      normalized,
    )
  ) {
    return false;
  }

  if (
    /\b(laptop|notebook|ultrabook|chromebook|macbook|thinkpad|ideapad|vivobook|zenbook|elitebook|probook|zbook|latitude|inspiron|xps|pavilion|omen|victus|aspire|swift|travelmate|nitro|predator|tuf|rog|raider|stealth|katana|modern|gram)\b/.test(
      normalized,
    )
  ) {
    return true;
  }

  const specs = extractSpecs(description);
  const hasLaptopStyleStorage = /\b(ssd|nvme|hdd|m\.2|m2)\b/.test(normalized);

  return Boolean(
    specs.processor_family &&
    (specs.ram_gb || specs.gpu_family || hasLaptopStyleStorage) &&
    specs.screen_in &&
    specs.screen_in >= 13,
  );
}

function getNetProfit(
  precioProveedorConIgv: number,
  product?: PriceableProduct,
): number {
  const isLaptop = isLaptopProduct(product);

  if (isLaptop) {
    if (precioProveedorConIgv <= 1000) return 50;
    if (precioProveedorConIgv <= 2000) return 100;
    return 150;
  }

  if (precioProveedorConIgv < 500) return 20;
  if (precioProveedorConIgv <= 1000) return 25;
  return 35;
}

/** Calcula el precio de venta al público desde el precio del proveedor con IGV incluido. */
export function calcSellingPrice(
  precioProveedorConIgv: number,
  product?: PriceableProduct,
): number {
  const utilidadNeta = getNetProfit(precioProveedorConIgv, product);
  const precioBaseSinIgv = precioProveedorConIgv / (1 + IGV_RATE);
  const precioFinal =
    ((precioBaseSinIgv + utilidadNeta) / COMMISSION_RATE) * (1 + IGV_RATE);

  return Math.ceil(precioFinal);
}

/** Formatea un precio en USD para mostrar al cliente. */
export function formatPrice(
  price: number | null,
  fallback = "Consultar precio",
): string {
  if (price === null) return fallback;
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/** Precio de venta formateado directamente desde precio proveedor. */
export function formatSellingPrice(
  precioProveedorConIgv: number | null,
  product?: PriceableProduct,
): string {
  if (precioProveedorConIgv === null) return "Consultar precio";
  return formatPrice(calcSellingPrice(precioProveedorConIgv, product));
}
