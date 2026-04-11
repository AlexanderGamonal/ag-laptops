import type { extractSpecs } from "@/lib/spec-extractor";
import type { Laptop } from "@/lib/supabase";

export type Filters = {
  search: string;
  marca: string;
  processor: string;
  ram: string;
  storage: string;
  screen: string;
  gpu: string;
  condicion: string;
  precioMax: string;
};

export type SortOption = "recent" | "price-asc" | "price-desc" | "brand";

export type SelectFilterKey =
  | "marca"
  | "processor"
  | "ram"
  | "storage"
  | "screen"
  | "gpu"
  | "condicion";

export type EnrichedLaptop = {
  laptop: Laptop;
  specs: ReturnType<typeof extractSpecs>;
  sellingPrice: number;
};

export type FilterOptions = {
  marcas: string[];
  processors: string[];
  rams: number[];
  storages: string[];
  screens: number[];
  gpus: string[];
  condiciones: string[];
};

export const EMPTY_FILTERS: Filters = {
  search: "",
  marca: "",
  processor: "",
  ram: "",
  storage: "",
  screen: "",
  gpu: "",
  condicion: "",
  precioMax: "",
};
