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
            <div className="relative h-[280px] sm:h-[340px] lg:h-[min(46vh,25.5rem)] bg-gradient-to-b from-white via-slate-50 to-slate-100 rounded-[24px] overflow-hidden flex items-center justify-center flex-shrink-0">
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
