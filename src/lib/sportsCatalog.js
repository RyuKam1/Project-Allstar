import { sanitizeText } from "@/lib/security/inputSanitizer";

/** @typedef {{ label: string, category: string }} SportEntry */

/** Top 50 globally popular sports (participation + viewership), catalog order = popularity rank. */
/** @type {SportEntry[]} */
export const SPORT_CATALOG = [
  { label: "Soccer", category: "Field" },
  { label: "Cricket", category: "Field" },
  { label: "Basketball", category: "Court" },
  { label: "Tennis", category: "Court" },
  { label: "Volleyball", category: "Court" },
  { label: "Table Tennis", category: "Court" },
  { label: "Baseball", category: "Field" },
  { label: "Golf", category: "Target & Precision" },
  { label: "Football", category: "Field" },
  { label: "Rugby", category: "Field" },
  { label: "Hockey", category: "Ice & Floor" },
  { label: "Badminton", category: "Court" },
  { label: "Swimming", category: "Aquatic" },
  { label: "Track & Field", category: "Track & Endurance" },
  { label: "Boxing", category: "Combat" },
  { label: "MMA", category: "Combat" },
  { label: "Cycling", category: "Track & Endurance" },
  { label: "Wrestling", category: "Combat" },
  { label: "Gymnastics", category: "Fitness" },
  { label: "Handball", category: "Court" },
  { label: "Field Hockey", category: "Field" },
  { label: "Softball", category: "Field" },
  { label: "Lacrosse", category: "Field" },
  { label: "Beach Volleyball", category: "Court" },
  { label: "Pickleball", category: "Court" },
  { label: "Water Polo", category: "Aquatic" },
  { label: "Squash", category: "Court" },
  { label: "Kabaddi", category: "Field" },
  { label: "Netball", category: "Court" },
  { label: "Skiing", category: "Snow" },
  { label: "Snowboarding", category: "Snow" },
  { label: "Surfing", category: "Aquatic" },
  { label: "Skateboarding", category: "Action" },
  { label: "BMX", category: "Action" },
  { label: "Rowing", category: "Aquatic" },
  { label: "Canoeing", category: "Aquatic" },
  { label: "Sailing", category: "Aquatic" },
  { label: "Climbing", category: "Action" },
  { label: "Fencing", category: "Combat" },
  { label: "Archery", category: "Target & Precision" },
  { label: "Bowling", category: "Target & Precision" },
  { label: "Weightlifting", category: "Fitness" },
  { label: "Powerlifting", category: "Fitness" },
  { label: "CrossFit", category: "Fitness" },
  { label: "Running", category: "Track & Endurance" },
  { label: "Triathlon", category: "Track & Endurance" },
  { label: "Diving", category: "Aquatic" },
  { label: "Figure Skating", category: "Ice & Floor" },
  { label: "Curling", category: "Ice & Floor" },
  { label: "Esports", category: "Digital" },
  { label: "Multi-sport", category: "General" },
  { label: "Other", category: "General" },
];

export const POPULAR_SPORT_COUNT = 50;
export const OTHER_SPORT_VALUE = "__other__";
export const SPORT_FILTER_ALL = "All";
export const DEFAULT_SPORT_LABEL = "Basketball";

export const TOURNAMENT_SPORT_LABELS = SPORT_CATALOG.map((s) => s.label);

const LABEL_SET = new Set(TOURNAMENT_SPORT_LABELS.map((l) => l.toLowerCase()));
const CATALOG_ORDER = new Map(
  TOURNAMENT_SPORT_LABELS.map((label, index) => [label.toLowerCase(), index]),
);

export function getCatalogSportLabels({ includeOther = false } = {}) {
  return SPORT_CATALOG.map((s) => s.label).filter(
    (label) => includeOther || label !== "Other",
  );
}

export function getPopularSportLabels() {
  return SPORT_CATALOG.slice(0, POPULAR_SPORT_COUNT).map((s) => s.label);
}

export function filterSportCatalog(query = "") {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return SPORT_CATALOG;
  return SPORT_CATALOG.filter(
    (s) => s.label.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
  );
}

export function normalizeSportLabel(label) {
  const trimmed = String(label || "").trim();
  if (!trimmed) return "";
  const known = TOURNAMENT_SPORT_LABELS.find(
    (entry) => entry.toLowerCase() === trimmed.toLowerCase(),
  );
  return known || trimmed;
}

export function isKnownSportLabel(label) {
  return LABEL_SET.has(String(label || "").trim().toLowerCase());
}

export function collectSportValues(items = [], getSportValue) {
  const values = new Set();

  for (const item of items) {
    const raw = getSportValue(item);
    if (Array.isArray(raw)) {
      raw.forEach((entry) => {
        const label = String(entry || "").trim();
        if (label) values.add(label);
      });
      continue;
    }

    const label = String(raw || "").trim();
    if (label) values.add(label);
  }

  return [...values];
}

export function orderSportLabels(labels = []) {
  const unique = [...new Set(labels.map((label) => String(label || "").trim()).filter(Boolean))];
  const known = [];
  const unknown = [];

  unique.forEach((label) => {
    const order = CATALOG_ORDER.get(label.toLowerCase());
    if (order != null) {
      known.push({ label: normalizeSportLabel(label), order });
    } else {
      unknown.push(label);
    }
  });

  known.sort((a, b) => a.order - b.order);
  unknown.sort((a, b) => a.localeCompare(b));

  return [...known.map((entry) => entry.label), ...unknown];
}

/**
 * Build filter pills from the platform catalog (top 50 sports) plus any custom sports in use.
 */
export function buildSportFilterPills(inUseSports = [], { includeUnknown = true } = {}) {
  const base = getPopularSportLabels();
  const unknown = orderSportLabels(inUseSports).filter((label) => !isKnownSportLabel(label));
  const labels = includeUnknown ? [...base, ...unknown] : base;

  return [SPORT_FILTER_ALL, ...labels];
}

export function matchesSportFilter(
  sportValue,
  filterSport = SPORT_FILTER_ALL,
  { multi = false } = {},
) {
  if (!filterSport || filterSport === SPORT_FILTER_ALL) return true;

  const target = normalizeSportLabel(filterSport).toLowerCase();

  if (multi) {
    const values = Array.isArray(sportValue) ? sportValue : [sportValue];
    return values.some((entry) => {
      const label = String(entry || "").trim().toLowerCase();
      if (!label) return false;
      return label === target || label.includes(target);
    });
  }

  return normalizeSportLabel(sportValue).toLowerCase() === target;
}

export function resolveSportSelection(selectedValue, customSport) {
  if (selectedValue === OTHER_SPORT_VALUE) {
    const custom = sanitizeText(customSport, 60);
    if (!custom) throw new Error("Enter a sport name for Other");
    return custom;
  }
  const label = sanitizeText(selectedValue, 60);
  if (!label) throw new Error("Pick a sport");
  return normalizeSportLabel(label);
}

export function sportLabelForFilter(label) {
  return sanitizeText(label, 60) || label;
}

/** @deprecated Use buildSportFilterPills() with live data instead. */
export const EVENT_SPORT_FILTER_PILLS = buildSportFilterPills(getPopularSportLabels());
