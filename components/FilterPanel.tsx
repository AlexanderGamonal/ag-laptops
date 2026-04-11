"use client";

import type { Filters, FilterOptions } from "@/lib/storefront-types";

type FilterPanelProps = {
  filters: Filters;
  availableOptions: FilterOptions;
  baseOptions: FilterOptions;
  setFilter: (key: keyof Filters) => (value: string) => void;
  clearFilters: () => void;
  hasFilters: boolean;
  activeCount: number;
  isOpen: boolean;
  onClose: () => void;
  filteredCount: number;
};

export default function FilterPanel({
  filters,
  availableOptions,
  baseOptions,
  setFilter,
  clearFilters,
  hasFilters,
  activeCount,
  isOpen,
  onClose,
  filteredCount,
}: FilterPanelProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <span className="font-semibold text-slate-900 text-sm">Filtros</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:underline"
              >
                Limpiar ({activeCount})
              </button>
            )}
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-11rem)]">
            <FilterFields
              filters={filters}
              options={availableOptions}
              baseOptions={baseOptions}
              setFilter={setFilter}
            />
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm">
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[28px] p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-slate-900">Filtrar catálogo</p>
              <button onClick={onClose} className="text-sm text-slate-500">
                Cerrar
              </button>
            </div>
            <FilterFields
              filters={filters}
              options={availableOptions}
              baseOptions={baseOptions}
              setFilter={setFilter}
            />
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={clearFilters}
                className="py-3 rounded-xl border border-slate-200 text-slate-700 font-medium"
              >
                Limpiar
              </button>
              <button
                onClick={onClose}
                className="py-3 rounded-xl bg-blue-600 text-white font-semibold"
              >
                Ver {filteredCount}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterFields({
  filters,
  options,
  baseOptions,
  setFilter,
}: {
  filters: Filters;
  options: FilterOptions;
  baseOptions: FilterOptions;
  setFilter: (key: keyof Filters) => (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <FilterBlock label="Marca">
        <CompactSelect
          value={filters.marca}
          onChange={setFilter("marca")}
          disabled={baseOptions.marcas.length === 0}
        >
          <option value="">Todas</option>
          {options.marcas.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </CompactSelect>
      </FilterBlock>
      <FilterBlock label="Procesador">
        <CompactSelect
          value={filters.processor}
          onChange={setFilter("processor")}
          disabled={baseOptions.processors.length === 0}
        >
          <option value="">Todos</option>
          {options.processors.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </CompactSelect>
      </FilterBlock>
      <FilterBlock label="RAM">
        <CompactSelect
          value={filters.ram}
          onChange={setFilter("ram")}
          disabled={baseOptions.rams.length === 0}
        >
          <option value="">Todas</option>
          {options.rams.map((value) => (
            <option key={value} value={String(value)}>
              {value}GB
            </option>
          ))}
        </CompactSelect>
      </FilterBlock>
      <FilterBlock label="Almacenamiento">
        <CompactSelect
          value={filters.storage}
          onChange={setFilter("storage")}
          disabled={baseOptions.storages.length === 0}
        >
          <option value="">Todos</option>
          {options.storages.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </CompactSelect>
      </FilterBlock>
      <FilterBlock label="Pantalla">
        <CompactSelect
          value={filters.screen}
          onChange={setFilter("screen")}
          disabled={baseOptions.screens.length === 0}
        >
          <option value="">Todas</option>
          {options.screens.map((value) => (
            <option key={value} value={String(value)}>{`${value}"`}</option>
          ))}
        </CompactSelect>
      </FilterBlock>
      <FilterBlock label="Tarjeta gráfica">
        <CompactSelect
          value={filters.gpu}
          onChange={setFilter("gpu")}
          disabled={baseOptions.gpus.length === 0}
        >
          <option value="">Todas</option>
          {options.gpus.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </CompactSelect>
      </FilterBlock>
      <FilterBlock label="Condición">
        <CompactSelect
          value={filters.condicion}
          onChange={setFilter("condicion")}
          disabled={baseOptions.condiciones.length === 0}
        >
          <option value="">Todas</option>
          {options.condiciones.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </CompactSelect>
      </FilterBlock>
      <FilterBlock label="Precio máximo (USD)">
        <input
          type="number"
          placeholder="Ej: 850"
          value={filters.precioMax}
          onChange={(event) => setFilter("precioMax")(event.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FilterBlock>
    </div>
  );
}

function FilterBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </div>
  );
}

function CompactSelect({
  value,
  onChange,
  children,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
    >
      {children}
    </select>
  );
}
