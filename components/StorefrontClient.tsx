"use client";

import {
  useCallback,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Laptop } from "@/lib/supabase";
import { trackStoreEvent } from "@/lib/analytics";
import { extractSpecs, normalizeText } from "@/lib/spec-extractor";
import { calcSellingPrice } from "@/lib/pricing";
import LaptopCard from "@/components/LaptopCard";
import BrandMark from "@/components/BrandMark";
import FilterPanel from "@/components/FilterPanel";
import StorefrontHero from "@/components/StorefrontHero";
import type {
  Filters,
  SortOption,
  SelectFilterKey,
  EnrichedLaptop,
  FilterOptions,
} from "@/lib/storefront-types";
import { EMPTY_FILTERS } from "@/lib/storefront-types";

const PAGE_SIZE = 24;

const FAQ = [
  {
    q: "¿El precio que veo es lo que voy a pagar?",
    a: "Sí. Todos los precios incluyen el IGV del 18%. No hay cargos adicionales ni sorpresas al momento de coordinar el pago.",
  },
  {
    q: "¿Los equipos reacondicionados son confiables?",
    a: "Sí. Cada equipo pasa por revisión técnica antes de publicarse. Tienen garantía técnica local y se indica claramente su condición y estado en la ficha.",
  },
  {
    q: "¿Puedo probar el equipo antes de comprarlo?",
    a: "Si estás en Lima puedes coordinar una revisión presencial. Si eres de provincia, te enviamos fotos y video detallado por WhatsApp antes de confirmar.",
  },
  {
    q: "¿Cómo es el proceso de compra?",
    a: "Encuentras el equipo en el catálogo, haces clic en WhatsApp y coordinamos disponibilidad, forma de pago y entrega. Todo por chat, sin formularios.",
  },
  {
    q: "¿Hacen envíos a provincia?",
    a: "Sí, enviamos a todo el Perú por Olva Courier, Shalom u otro servicio según tu ubicación. El costo de envío se coordina por WhatsApp.",
  },
  {
    q: "¿Qué medios de pago aceptan?",
    a: "Transferencia bancaria, Yape y Plin. Para compras de provincia también aceptamos depósito a cuenta.",
  },
];

function getFiltersFromSearchParams(searchParams: URLSearchParams): Filters {
  return {
    search: searchParams.get("search") ?? "",
    marca: searchParams.get("marca") ?? "",
    processor: searchParams.get("processor") ?? "",
    ram: searchParams.get("ram") ?? "",
    storage: searchParams.get("storage") ?? "",
    screen: searchParams.get("screen") ?? "",
    gpu: searchParams.get("gpu") ?? "",
    condicion: searchParams.get("condicion") ?? "",
    precioMax: searchParams.get("precioMax") ?? "",
  };
}

function matchesSearch(laptop: Laptop, query: string) {
  const q = normalizeText(query);
  return (
    normalizeText(laptop.numero_parte).includes(q) ||
    normalizeText(laptop.descripcion || "").includes(q) ||
    normalizeText(laptop.marca || "").includes(q) ||
    normalizeText(laptop.part_number || "").includes(q)
  );
}

function matchesFilters(
  item: EnrichedLaptop,
  filters: Filters,
  searchQuery: string,
  excludedKey?: SelectFilterKey,
) {
  const { laptop, specs, sellingPrice } = item;

  if (searchQuery && !matchesSearch(laptop, searchQuery)) return false;
  if (
    excludedKey !== "marca" &&
    filters.marca &&
    (laptop.marca || "").toLowerCase() !== filters.marca.toLowerCase()
  )
    return false;
  if (
    excludedKey !== "condicion" &&
    filters.condicion &&
    (laptop.condicion || "").toLowerCase() !== filters.condicion.toLowerCase()
  )
    return false;
  if (
    excludedKey !== "processor" &&
    filters.processor &&
    specs.processor_family !== filters.processor
  )
    return false;
  if (
    excludedKey !== "ram" &&
    filters.ram &&
    specs.ram_gb !== Number.parseInt(filters.ram, 10)
  )
    return false;
  if (
    excludedKey !== "storage" &&
    filters.storage &&
    specs.storage !== filters.storage
  )
    return false;
  if (
    excludedKey !== "screen" &&
    filters.screen &&
    specs.screen_in !== Number.parseFloat(filters.screen)
  )
    return false;
  if (excludedKey !== "gpu" && filters.gpu && specs.gpu_family !== filters.gpu)
    return false;
  if (filters.precioMax && sellingPrice > Number.parseFloat(filters.precioMax))
    return false;

  return true;
}

function buildOptions(items: EnrichedLaptop[]): FilterOptions {
  return {
    marcas: Array.from(
      new Set(items.map((i) => i.laptop.marca).filter(Boolean)),
    ).sort() as string[],
    processors: Array.from(
      new Set(items.map((i) => i.specs.processor_family).filter(Boolean)),
    ).sort() as string[],
    rams: (
      Array.from(
        new Set(items.map((i) => i.specs.ram_gb).filter(Boolean)),
      ) as number[]
    ).sort((a, b) => a - b),
    storages: Array.from(
      new Set(items.map((i) => i.specs.storage).filter(Boolean)),
    ).sort() as string[],
    screens: (
      Array.from(
        new Set(items.map((i) => i.specs.screen_in).filter(Boolean)),
      ) as number[]
    ).sort((a, b) => a - b),
    gpus: Array.from(
      new Set(items.map((i) => i.specs.gpu_family).filter(Boolean)),
    ).sort() as string[],
    condiciones: Array.from(
      new Set(items.map((i) => i.laptop.condicion).filter(Boolean)),
    ).sort() as string[],
  };
}

export default function StorefrontClient({
  laptops,
  waNumber,
  storeEmail,
}: {
  laptops: Laptop[];
  waNumber: string;
  storeEmail: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialFilters = useMemo(
    () => getFiltersFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const initialSort = (searchParams.get("sort") as SortOption | null) ?? "recent";

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [page, setPage] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const deferredSearch = useDeferredValue(filters.search);

  const applyCatalogState = useCallback(
    (nextFilters: Filters, nextSort: SortOption) => {
      setFilters(nextFilters);
      setSort(nextSort);
      setPage(1);

      const next = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) next.set(key, value);
      });
      if (nextSort !== "recent") next.set("sort", nextSort);

      router.replace(next.toString() ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const enriched = useMemo(
    () =>
      laptops.map((laptop) => ({
        laptop,
        specs: extractSpecs(laptop.descripcion),
        sellingPrice: calcSellingPrice(laptop.precio ?? 0, laptop),
      })),
    [laptops],
  );

  const baseOptions = useMemo(() => buildOptions(enriched), [enriched]);

  const availableOptions = useMemo(() => {
    const matchingFor = (excludedKey?: SelectFilterKey) =>
      enriched.filter((item) =>
        matchesFilters(item, filters, deferredSearch, excludedKey),
      );
    return {
      marcas: buildOptions(matchingFor("marca")).marcas,
      processors: buildOptions(matchingFor("processor")).processors,
      rams: buildOptions(matchingFor("ram")).rams,
      storages: buildOptions(matchingFor("storage")).storages,
      screens: buildOptions(matchingFor("screen")).screens,
      gpus: buildOptions(matchingFor("gpu")).gpus,
      condiciones: buildOptions(matchingFor("condicion")).condiciones,
    };
  }, [deferredSearch, enriched, filters]);

  const filtered = useMemo(() => {
    const active = enriched.filter((item) =>
      matchesFilters(item, filters, deferredSearch),
    );
    return active.toSorted((left, right) => {
      if (sort === "price-asc") return left.sellingPrice - right.sellingPrice;
      if (sort === "price-desc") return right.sellingPrice - left.sellingPrice;
      if (sort === "brand")
        return (left.laptop.marca || "").localeCompare(right.laptop.marca || "");
      return (
        new Date(right.laptop.updated_at).getTime() -
        new Date(left.laptop.updated_at).getTime()
      );
    });
  }, [deferredSearch, enriched, filters, sort]);

  // Sync URL → state on browser back/forward
  useEffect(() => {
    const nextFilters = getFiltersFromSearchParams(
      new URLSearchParams(searchParams.toString()),
    );
    const nextSort = (searchParams.get("sort") as SortOption | null) ?? "recent";
    setFilters((prev) =>
      JSON.stringify(prev) === JSON.stringify(nextFilters) ? prev : nextFilters,
    );
    setSort((prev) => (prev === nextSort ? prev : nextSort));
  }, [searchParams]);

  // Auto-clear filters that no longer have available options
  useEffect(() => {
    const next = { ...filters };
    let changed = false;

    const checks: [keyof Filters, unknown[], unknown][] = [
      ["marca", availableOptions.marcas, filters.marca],
      ["processor", availableOptions.processors, filters.processor],
      ["storage", availableOptions.storages, filters.storage],
      ["gpu", availableOptions.gpus, filters.gpu],
      ["condicion", availableOptions.condiciones, filters.condicion],
    ];
    for (const [key, list, val] of checks) {
      if (val && !(list as string[]).includes(val as string)) {
        (next as Record<string, string>)[key] = "";
        changed = true;
      }
    }
    if (
      filters.ram &&
      !availableOptions.rams.includes(Number.parseInt(filters.ram, 10))
    ) {
      next.ram = "";
      changed = true;
    }
    if (
      filters.screen &&
      !availableOptions.screens.includes(Number.parseFloat(filters.screen))
    ) {
      next.screen = "";
      changed = true;
    }

    if (changed) applyCatalogState(next, sort);
  }, [applyCatalogState, availableOptions, filters, sort]);

  // Analytics: track search
  useEffect(() => {
    if (!deferredSearch) return;
    const id = window.setTimeout(() => {
      trackStoreEvent("search_used", { query: deferredSearch, results: filtered.length });
    }, 500);
    return () => window.clearTimeout(id);
  }, [deferredSearch, filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = Object.values(filters).some((v) => v !== "");
  const activeCount = Object.values(filters).filter((v) => v !== "").length;

  const setFilter = (key: keyof Filters) => (value: string) => {
    startTransition(() => {
      applyCatalogState({ ...filters, [key]: value }, sort);
    });
  };

  function clearFilters() {
    startTransition(() => {
      applyCatalogState(EMPTY_FILTERS, "recent");
    });
  }

  function toggleMobileFilters() {
    const next = !mobileFiltersOpen;
    setMobileFiltersOpen(next);
    if (next) trackStoreEvent("filters_opened", { source: "mobile" });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white/95 border-b border-slate-200 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <BrandMark compact variant="icon" />
          </Link>

          <div className="flex-1 max-w-xl hidden sm:block">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Busca por marca, procesador, modelo o part number"
                value={filters.search}
                onChange={(e) => setFilter("search")(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>
          </div>

          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackStoreEvent("whatsapp_click", { source: "header" })}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors"
            >
              Hablar con un asesor
            </a>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <StorefrontHero laptopsCount={laptops.length} />

        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-5">
          <FilterPanel
            filters={filters}
            availableOptions={availableOptions}
            baseOptions={baseOptions}
            setFilter={setFilter}
            clearFilters={clearFilters}
            hasFilters={hasFilters}
            activeCount={activeCount}
            isOpen={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            filteredCount={filtered.length}
          />

          <div className="min-w-0">
            {/* Sort bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-sm text-slate-500">
                  {filtered.length}{" "}
                  <strong className="text-slate-700">
                    producto{filtered.length === 1 ? "" : "s"}
                  </strong>
                  {hasFilters && <span className="text-blue-600"> filtrados</span>}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Ordena y filtra rápido por marca, especificación y rango de precio.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="lg:hidden px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white"
                  onClick={toggleMobileFilters}
                >
                  Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
                </button>
                <select
                  value={sort}
                  onChange={(e) => applyCatalogState(filters, e.target.value as SortOption)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recent">Más recientes</option>
                  <option value="price-asc">Precio menor</option>
                  <option value="price-desc">Precio mayor</option>
                  <option value="brand">Marca A-Z</option>
                </select>
              </div>
            </div>

            {/* Mobile search */}
            <div className="sm:hidden mb-4">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar laptops..."
                  value={filters.search}
                  onChange={(e) => setFilter("search")(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(filters).map(([key, value]) => {
                  if (!value) return null;
                  const label: Record<string, string> = {
                    search: `"${value}"`,
                    marca: value,
                    processor: value,
                    ram: `${value}GB RAM`,
                    storage: value,
                    screen: `${value}"`,
                    gpu: value,
                    condicion: value,
                    precioMax: `≤ $${value}`,
                  };
                  return (
                    <button
                      key={key}
                      onClick={() => setFilter(key as keyof Filters)("")}
                      className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100 hover:bg-blue-100"
                    >
                      {label[key]}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Product grid */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                <p className="text-lg font-medium">
                  No encontramos equipos con esos filtros
                </p>
                <p className="text-sm mt-2 max-w-md">
                  Prueba quitando una restricción o escribe la marca, el procesador o el part number.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-5 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  Ver todo el catálogo
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleItems.map(({ laptop, specs }) => (
                    <LaptopCard key={laptop.id} laptop={laptop} specs={specs} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Anterior
                    </button>

                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                        .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) =>
                          p === '…' ? (
                            <span key={`ellipsis-${idx}`} className="px-2 py-2 text-slate-400 text-sm">…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => { setPage(p as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors
                                ${page === p ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                            >
                              {p}
                            </button>
                          )
                        )}
                    </div>

                    <button
                      onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            )}

            {/* FAQ + CTA */}
            <section className="mt-16 grid lg:grid-cols-[1fr_320px] gap-5">
              <div className="bg-white rounded-3xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  Preguntas frecuentes
                </h2>
                <div className="flex flex-col gap-2">
                  {FAQ.map((item, index) => (
                    <div
                      key={item.q}
                      className="rounded-2xl border border-slate-200 overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center justify-between px-5 py-4 text-left"
                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      >
                        <span className="font-medium text-slate-800 text-sm">
                          {item.q}
                        </span>
                        <span className="text-slate-400">
                          {openFaq === index ? "−" : "+"}
                        </span>
                      </button>
                      {openFaq === index && (
                        <div className="px-5 pb-4 text-sm text-slate-600">
                          {item.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-400">
                    ¿Por qué elegirnos?
                  </p>
                  <h3 className="mt-3 text-2xl font-bold leading-snug">
                    El equipo correcto, al precio justo, con respaldo real.
                  </h3>
                  <p className="mt-3 text-sm text-slate-300 leading-7">
                    No vendemos cajas. Te ayudamos a encontrar la laptop que
                    necesitas, con stock disponible y sin sorpresas en el precio.
                  </p>
                  <ul className="mt-5 space-y-3">
                    {[
                      { icon: '✓', text: 'Precios finales con IGV incluido — sin cobros extra al pagar' },
                      { icon: '✓', text: 'Stock real: lo que ves está disponible para entrega inmediata' },
                      { icon: '✓', text: 'Te asesoramos por WhatsApp para que elijas sin equivocarte' },
                      { icon: '✓', text: 'Garantía técnica en todos los equipos reacondicionados' },
                    ].map(({ icon, text }) => (
                      <li key={text} className="flex items-start gap-2.5 text-sm text-slate-200">
                        <span className="text-green-400 font-bold mt-0.5 flex-shrink-0">{icon}</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {waNumber && (
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Hola, quiero asesoría para elegir una laptop.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackStoreEvent('whatsapp_click', { source: 'why-us' })}
                    className="mt-6 flex items-center justify-center gap-2 px-5 py-3 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-2xl transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.122 1.533 5.855L.054 23.447a.5.5 0 00.499.553h.056l5.752-1.507A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.938a9.932 9.932 0 01-5.035-1.362l-.361-.214-3.737.979.998-3.647-.235-.374A9.938 9.938 0 012.062 12C2.062 6.51 6.51 2.062 12 2.062S21.938 6.51 21.938 12 17.49 21.938 12 21.938z"/>
                    </svg>
                    Pedir asesoría gratis
                  </a>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-24 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-slate-500">
            <div>
              <div className="sm:hidden mb-2">
                <BrandMark compact variant="icon" />
              </div>
              <div className="hidden sm:block mb-1">
                <BrandMark compact showSlogan />
              </div>
              <p className="text-xs text-slate-400 max-w-xs">
                Laptops nuevas y reacondicionadas con garantía técnica. Enviamos a todo el Perú.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex items-center gap-x-4 gap-y-2 w-full sm:w-auto text-sm">
              {storeEmail && (
                <a
                  href={`mailto:${storeEmail}`}
                  onClick={() => trackStoreEvent("email_click", { source: "footer" })}
                  className="col-span-2 sm:col-span-1 break-all hover:text-slate-700"
                >
                  {storeEmail}
                </a>
              )}
              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hola, vi el catálogo y me interesa una laptop. ¿Puedes asesorarme?")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackStoreEvent("whatsapp_click", { source: "footer" })}
                  className="hover:text-green-600 font-medium"
                >
                  WhatsApp
                </a>
              )}
              <Link href="/admin" className="hover:text-slate-700 text-slate-300">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp button */}
      {waNumber && (
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hola, vi el catálogo y me interesa una laptop. ¿Puedes asesorarme?")}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Contactar por WhatsApp"
          onClick={() => trackStoreEvent("whatsapp_click", { source: "floating" })}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 px-4 sm:px-5 h-12 sm:h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center gap-2 transition-all hover:scale-105"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.122 1.533 5.855L.054 23.447a.5.5 0 00.499.553h.056l5.752-1.507A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.938a9.932 9.932 0 01-5.035-1.362l-.361-.214-3.737.979.998-3.647-.235-.374A9.938 9.938 0 012.062 12C2.062 6.51 6.51 2.062 12 2.062S21.938 6.51 21.938 12 17.49 21.938 12 21.938z"/>
            </svg>
          <span className="font-semibold text-sm">Consultar ahora</span>
        </a>
      )}
    </div>
  );
}
