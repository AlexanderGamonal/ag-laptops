"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Laptop } from "@/lib/supabase";
import { trackStoreEvent } from "@/lib/analytics";
import { extractSpecs } from "@/lib/spec-extractor";
import { formatSellingPrice } from "@/lib/pricing";
import BrandMark from "@/components/BrandMark";

export default function ProductDetailClient({
  laptop,
  whatsappNumber,
  contactEmail,
}: {
  laptop: Laptop;
  whatsappNumber: string;
  contactEmail: string;
}) {
  const router = useRouter();
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photos = [laptop.foto_1, laptop.foto_2, laptop.foto_3].filter(
    Boolean,
  ) as string[];
  const specs = extractSpecs(laptop.descripcion);
  const whatsappMsg = encodeURIComponent(
    `Hola, me interesa esta laptop:\n*${laptop.numero_parte}*\n${laptop.descripcion?.substring(0, 120) || ""}\nPrecio: ${formatSellingPrice(laptop.precio, laptop)}`,
  );
  const emailSubject = encodeURIComponent(
    `Consulta sobre laptop ${laptop.numero_parte}`,
  );

  useEffect(() => {
    trackStoreEvent("product_view", {
      id: laptop.id,
      numeroParte: laptop.numero_parte,
    });
  }, [laptop.id, laptop.numero_parte]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") setActivePhoto((p) => (p - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") setActivePhoto((p) => (p + 1) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, photos.length]);

  function handleBackNavigation() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackNavigation}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Volver al catálogo"
            >
              ←
            </button>
            <BrandMark compact variant="icon" />
          </div>
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackStoreEvent("whatsapp_click", {
                  source: "detail-header",
                  id: laptop.id,
                })
              }
              className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600"
            >
              Consultar
            </a>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 lg:h-[calc(100vh-5.5rem)]">
        <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-4 items-start lg:h-full">
          <section className="bg-white rounded-[28px] border border-slate-200 p-4 shadow-sm space-y-3 lg:h-full lg:flex lg:flex-col">
            <div
              className="relative h-[280px] sm:h-[340px] lg:h-[min(46vh,25.5rem)] bg-gradient-to-b from-white via-slate-50 to-slate-100 rounded-[24px] overflow-hidden flex items-center justify-center flex-shrink-0"
              onClick={() => photos.length > 0 && setLightboxOpen(true)}
              style={photos.length > 0 ? { cursor: "zoom-in" } : undefined}
            >
              {photos.length > 0 ? (
                <Image
                  src={photos[activePhoto]}
                  alt={`${laptop.numero_parte} - foto ${activePhoto + 1}`}
                  fill
                  className="object-contain object-center p-2 sm:p-3"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  priority
                />
              ) : (
                <div className="text-center text-slate-400">
                  <p className="font-medium">Sin fotos cargadas</p>
                  <p className="text-sm mt-1">
                    Sube imágenes desde el panel para mejorar conversión.
                  </p>
                </div>
              )}
            </div>

            {photos.length > 1 && (
              <div className="grid grid-cols-3 gap-2.5">
                {photos.map((photo, index) => (
                  <button
                    key={photo}
                    onClick={() => setActivePhoto(index)}
                    className={`relative h-24 rounded-2xl overflow-hidden border-2 bg-gradient-to-b from-white to-slate-50 ${
                      activePhoto === index
                        ? "border-blue-500"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Image
                      src={photo}
                      alt={`Miniatura ${index + 1}`}
                      fill
                      className="object-contain object-center p-1.5"
                      sizes="160px"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 lg:flex-1">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                Descripción
              </p>
              <p className="mt-2 text-[0.95rem] text-slate-700 leading-7 whitespace-pre-line">
                {laptop.descripcion || "Sin descripción disponible."}
              </p>
            </div>
          </section>

          <section className="bg-white rounded-[28px] border border-slate-200 p-4 shadow-sm space-y-2.5 lg:h-full lg:overflow-hidden">
            <div className="flex flex-wrap items-center gap-2">
              {laptop.marca && (
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
                  {laptop.marca}
                </span>
              )}
              {laptop.condicion && (
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
                  {laptop.condicion}
                </span>
              )}
              {laptop.estado && (
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium">
                  {laptop.estado}
                </span>
              )}
            </div>

            <div>
              {laptop.part_number && (
                <>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Part number fabricante
                  </p>
                  <h1 className="mt-0.5 text-sm sm:text-[15px] font-medium text-slate-900 break-all leading-tight">
                    {laptop.part_number}
                  </h1>
                </>
              )}
            </div>

            <div className="rounded-3xl bg-slate-950 text-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                Precio de venta
              </p>
              <p className="mt-1 text-[1.85rem] sm:text-[2.05rem] leading-none font-bold">
                {formatSellingPrice(laptop.precio, laptop)}
              </p>
              <p className="mt-1.5 text-[13px] text-slate-300">
                Precio final con IGV incluido.
              </p>
            </div>

            {(specs.processor ||
              specs.ram_gb ||
              specs.storage ||
              specs.screen_in ||
              specs.screen_details ||
              specs.gpu ||
              specs.front_camera ||
              specs.back_camera ||
              specs.connectivity ||
              specs.color) && (
                <div className="grid grid-cols-2 gap-2">
                {specs.processor && (
                  <SpecCard label="Procesador" value={specs.processor} />
                )}
                {specs.ram_gb && (
                  <SpecCard label="Memoria RAM" value={`${specs.ram_gb} GB`} />
                )}
                {specs.storage && (
                  <SpecCard label="Almacenamiento" value={specs.storage} />
                )}
                {(specs.screen_in || specs.screen_details) && (
                  <SpecCard
                    label="Pantalla"
                    value={[
                      specs.screen_in ? `${specs.screen_in}"` : null,
                      specs.screen_details,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                )}
                  {specs.gpu && <SpecCard label="Gráfica" value={specs.gpu} />}
                  {!specs.has_dedicated_gpu && specs.processor && (
                    <SpecCard label="Tipo de gráfica" value="Integrada" />
                  )}
                  {specs.front_camera && (
                    <SpecCard label="Cámara frontal" value={specs.front_camera} />
                  )}
                  {specs.back_camera && (
                    <SpecCard label="Cámara trasera" value={specs.back_camera} />
                  )}
                  {specs.connectivity && (
                    <SpecCard label="Conectividad" value={specs.connectivity} />
                  )}
                  {specs.color && <SpecCard label="Color" value={specs.color} />}
                </div>
              )}

            <div className="grid sm:grid-cols-2 gap-2.5">
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackStoreEvent("whatsapp_click", {
                      source: "detail-cta",
                      id: laptop.id,
                    })
                  }
                  className="flex items-center justify-center w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors"
                >
                  Pedir por WhatsApp
                </a>
              )}
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}?subject=${emailSubject}&body=${encodeURIComponent(`Hola, me interesa el producto ${laptop.numero_parte}.`)}`}
                  onClick={() =>
                    trackStoreEvent("email_click", {
                      source: "detail-cta",
                      id: laptop.id,
                    })
                  }
                  className="flex items-center justify-center w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                >
                  Enviar correo
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[13px] text-slate-600">
              <Benefit text="Respuesta comercial rápida" />
              <Benefit text="Envíos coordinados a todo el país" />
              <Benefit text="Precio listo para venta" />
              <Benefit text="Soporte y garantía visibles" />
            </div>
          </section>
        </div>
      </main>

      {/* Spacer so sticky CTA doesn't cover content on mobile */}
      {whatsappNumber && <div className="h-20 lg:hidden" />}

      {/* Sticky mobile CTA bar */}
      {whatsappNumber && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-slate-200 shadow-lg px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Precio final con IGV</p>
            <p className="text-xl font-bold text-slate-900 truncate">
              {formatSellingPrice(laptop.precio, laptop)}
            </p>
          </div>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackStoreEvent("whatsapp_click", { source: "detail-sticky", id: laptop.id })}
            className="flex-shrink-0 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.118 1.532 5.845L.057 23.428a.5.5 0 00.611.612l5.638-1.476A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.864 9.864 0 01-5.034-1.376l-.36-.214-3.742.98.999-3.648-.235-.374A9.86 9.86 0 012.1 12C2.1 6.528 6.528 2.1 12 2.1S21.9 6.528 21.9 12 17.472 21.9 12 21.9z" />
            </svg>
            Consultar
          </a>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none p-2"
            onClick={() => setLightboxOpen(false)}
          >
            ✕
          </button>
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[activePhoto]}
              alt={`${laptop.numero_parte} - foto ${activePhoto + 1}`}
              className="max-w-[90vw] max-h-[90vh] object-contain"
            />
          </div>
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl leading-none p-2"
                onClick={(e) => { e.stopPropagation(); setActivePhoto((p) => (p - 1 + photos.length) % photos.length); }}
              >
                ‹
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl leading-none p-2"
                onClick={(e) => { e.stopPropagation(); setActivePhoto((p) => (p + 1) % photos.length); }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-800 leading-5">
        {value}
      </p>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-1.5 leading-5">{text}</div>
  );
}
