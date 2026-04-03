/**
 * Lógica de precios de venta.
 *
 * Fórmula:
 *   precio_venta = precio_proveedor + $60 (margen) + precio_proveedor × 18% (IGV)
 *              = precio_proveedor × 1.18 + 60
 *
 * El precio del proveedor ya incluye su propio IGV; el 18% se aplica
 * sobre el precio base para calcular el precio final de venta al público.
 */

export const MARGEN_FIJO_USD = 60
export const IGV_RATE        = 0.18

/** Calcula el precio de venta al público desde el precio del proveedor. */
export function calcSellingPrice(precioProveedor: number): number {
  return Math.ceil(precioProveedor * (1 + IGV_RATE) + MARGEN_FIJO_USD)
}

/** Formatea un precio en USD para mostrar al cliente. */
export function formatPrice(price: number | null, fallback = 'Consultar precio'): string {
  if (price === null) return fallback
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/** Precio de venta formateado directamente desde precio proveedor. */
export function formatSellingPrice(precioProveedor: number | null): string {
  if (precioProveedor === null) return 'Consultar precio'
  return formatPrice(calcSellingPrice(precioProveedor))
}
