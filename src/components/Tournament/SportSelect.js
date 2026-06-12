"use client";

import React, { useMemo, useState } from "react";
import {
  OTHER_SPORT_VALUE,
  POPULAR_SPORT_COUNT,
  filterSportCatalog,
} from "@/lib/sportsCatalog";
import styles from "./sport-select.module.css";

export default function SportSelect({
  value,
  customSport = "",
  onChange,
  onCustomSportChange,
  id = "tournament-sport",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => filterSportCatalog(query), [query]);
  const isOther = value === OTHER_SPORT_VALUE;

  const displayValue =
    value === OTHER_SPORT_VALUE
      ? customSport || "Other (custom)"
      : value || "Select sport";

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        id={id}
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.triggerLabel}>{displayValue}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className={styles.panel} role="listbox" aria-label="Sports">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sports…"
            className={styles.search}
            autoFocus
          />
          <div className={styles.list}>
            {filtered.map((sport) => (
              <button
                key={sport.label}
                type="button"
                role="option"
                aria-selected={value === sport.label}
                className={`${styles.option} ${value === sport.label ? styles.optionActive : ""}`}
                onClick={() => {
                  onChange(sport.label === "Other" ? OTHER_SPORT_VALUE : sport.label);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span>{sport.label}</span>
                <span className={styles.category}>{sport.category}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className={styles.empty}>No sports match that search.</p>
            )}
          </div>
        </div>
      )}

      {isOther && (
        <input
          type="text"
          value={customSport}
          maxLength={60}
          onChange={(e) => onCustomSportChange?.(e.target.value)}
          placeholder="Type your sport (e.g. Spikeball)"
          className={styles.customInput}
          aria-label="Custom sport name"
        />
      )}

      <p className={styles.hint}>
        {POPULAR_SPORT_COUNT} sports supported — pick Other for anything not listed yet.
      </p>
    </div>
  );
}
