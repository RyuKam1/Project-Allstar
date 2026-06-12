"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SPORT_FILTER_ALL,
  buildSportFilterPills,
  matchesSportFilter,
} from "@/lib/sportsCatalog";

/**
 * Sport filter state for listing pages.
 * Pills are built from sports currently in use, ordered by the platform catalog.
 * Pass `{ loading: true }` while fetching so pills stay on "All" only.
 */
export function useSportFilter(inUseSports = [], options = {}) {
  const { loading = false, includeUnknown = true, multi = false } = options;
  const [filterSport, setFilterSport] = useState(SPORT_FILTER_ALL);

  const sportFilters = useMemo(
    () => buildSportFilterPills(inUseSports, { includeUnknown }),
    [inUseSports, includeUnknown],
  );

  useEffect(() => {
    if (filterSport !== SPORT_FILTER_ALL && !sportFilters.includes(filterSport)) {
      setFilterSport(SPORT_FILTER_ALL);
    }
  }, [sportFilters, filterSport]);

  const matchesFilter = (sportValue) =>
    matchesSportFilter(sportValue, filterSport, { multi });

  return {
    filterSport,
    setFilterSport,
    sportFilters,
    filtersLoading: loading,
    matchesFilter,
  };
}
