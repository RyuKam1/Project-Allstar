"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/UI/primitives";
import Icon from "@/components/UI/Icon";
import styles from "./sport-filter-pills.module.css";

const SKELETON_WIDTHS = [52, 68, 76, 58, 84, 64, 72, 56, 80, 62, 74, 66];

export default function SportFilterPills({
  sportFilters = [],
  filterSport,
  onSelect,
  loading = false,
  className = "",
  skeletonCount = 12,
  enableSearch = false,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef(null);

  const visibleFilters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sportFilters;
    return sportFilters.filter((sport) => sport.toLowerCase().includes(q));
  }, [sportFilters, searchQuery]);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  const toggleSearch = () => {
    setSearchOpen((open) => {
      if (open) setSearchQuery("");
      return !open;
    });
  };

  const rootClass = [styles.bar, className].filter(Boolean).join(" ");
  const railClass = [
    styles.searchRail,
    searchOpen ? styles.searchRailOpen : "",
  ]
    .filter(Boolean)
    .join(" ");

  const pillsContent = loading ? (
    Array.from({ length: skeletonCount }, (_, index) => (
      <Skeleton
        key={index}
        width={SKELETON_WIDTHS[index % SKELETON_WIDTHS.length]}
        height={40}
        className={styles.pillSkeleton}
      />
    ))
  ) : (
    visibleFilters.map((sport) => (
      <button
        key={sport}
        type="button"
        onClick={() => onSelect(sport)}
        className={`filter-pill ${filterSport === sport ? "filter-pill-active" : ""}`}
        role="tab"
        aria-selected={filterSport === sport}
      >
        <span>{sport}</span>
      </button>
    ))
  );

  if (!enableSearch) {
    const simpleClass = ["filter-group", className].filter(Boolean).join(" ");
    if (loading) {
      return (
        <div className={simpleClass} aria-busy="true" aria-label="Loading sport filters">
          {pillsContent}
        </div>
      );
    }
    return (
      <div className={simpleClass} role="tablist" aria-label="Sport filters">
        {pillsContent}
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <div
        className={styles.pillsViewport}
        aria-busy={loading}
        data-search-open={searchOpen || undefined}
      >
        <div
          className={`filter-group ${styles.pillsScroll}`}
          role={loading ? undefined : "tablist"}
          aria-label={loading ? "Loading sport filters" : "Sport filters"}
        >
          {pillsContent}
        </div>
      </div>

      <div className={railClass}>
        <div className={styles.searchPanel} aria-hidden={!searchOpen}>
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search sports…"
            className={styles.searchInput}
            aria-label="Search sports"
            tabIndex={searchOpen ? 0 : -1}
          />
        </div>
        <button
          type="button"
          className={`${styles.searchToggle} ${searchOpen ? styles.searchToggleActive : ""}`}
          onClick={toggleSearch}
          aria-expanded={searchOpen}
          aria-label={searchOpen ? "Close sport search" : "Search sports"}
        >
          <Icon name={searchOpen ? "close" : "search"} size={18} />
        </button>
      </div>
    </div>
  );
}
