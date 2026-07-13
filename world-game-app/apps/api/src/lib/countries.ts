import countriesData from "../data/countries.json";
import tldData from "../data/sources/country-by-domain-tld.json";
import governmentData from "../data/sources/country-by-government-type.json";
import independenceData from "../data/sources/country-by-independence-date.json";
import symbolData from "../data/sources/country-by-national-symbol.json";
import densityData from "../data/sources/country-by-population-density.json";
import religionData from "../data/sources/country-by-religion.json";

export interface Country {
  country: string;
  capital: string;
  population: number;
  continent: string;
  region: string | null;
  currencyName: string | null;
  languages: string[];
  dish: string | null;
  abbreviation: string | null;
  flagBase64: string;
  tld: string | null;
  government: string | null;
  independence: number | null;
  symbol: string | null;
  populationDensity: number | null;
  religion: string | null;
}

function indexByCountry<T extends { country: string }, K extends keyof T>(
  rows: T[],
  key: K,
): Map<string, T[K] | null> {
  const map = new Map<string, T[K] | null>();
  for (const row of rows) {
    const value = row[key];
    map.set(row.country, value === null || value === undefined ? null : value);
  }
  return map;
}

const tldByCountry = indexByCountry(
  tldData as { country: string; tld: string | null }[],
  "tld",
);
const governmentByCountry = indexByCountry(
  governmentData as { country: string; government: string | null }[],
  "government",
);
const independenceByCountry = indexByCountry(
  independenceData as { country: string; independence: number | null }[],
  "independence",
);
const symbolByCountry = indexByCountry(
  symbolData as { country: string; symbol: string | null }[],
  "symbol",
);
const densityByCountry = indexByCountry(
  densityData as { country: string; density: number | null }[],
  "density",
);
const religionByCountry = indexByCountry(
  religionData as { country: string; religion: string | null }[],
  "religion",
);

export const countries: Country[] = (
  countriesData as Omit<
    Country,
    | "tld"
    | "government"
    | "independence"
    | "symbol"
    | "populationDensity"
    | "religion"
  >[]
).map((c) => ({
  ...c,
  tld: tldByCountry.get(c.country) ?? null,
  government: governmentByCountry.get(c.country) ?? null,
  independence: independenceByCountry.get(c.country) ?? null,
  symbol: symbolByCountry.get(c.country) ?? null,
  populationDensity: densityByCountry.get(c.country) ?? null,
  religion: religionByCountry.get(c.country) ?? null,
}));

// Sorted by population descending so difficulty tiers can slice well-known
// countries (easy) from obscure ones (hard).
const byPopulationDesc = [...countries].sort(
  (a, b) => b.population - a.population,
);

export const EASY_POOL = byPopulationDesc.slice(0, 60);
export const MEDIUM_POOL = byPopulationDesc.slice(60, 160);
export const HARD_POOL = byPopulationDesc.slice(160);

export function poolForDifficulty(
  difficulty: "easy" | "medium" | "hard",
): Country[] {
  if (difficulty === "easy") return EASY_POOL;
  if (difficulty === "medium") return MEDIUM_POOL;
  return HARD_POOL;
}
