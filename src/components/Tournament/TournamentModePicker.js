"use client";

import React from "react";
import { BRACKET_MODE_OPTIONS, normalizeBracketMode } from "@/lib/tournamentModes";
import styles from "./tournamentModePicker.module.css";

export default function TournamentModePicker({ value, onChange, disabled = false }) {
  const selected = normalizeBracketMode(value);

  return (
    <div className={styles.picker} role="radiogroup" aria-label="Tournament format">
      {BRACKET_MODE_OPTIONS.map((option) => {
        const active = selected === option.value;
        return (
          <label
            key={option.value}
            className={`${styles.option} ${active ? styles.optionActive : ""}`}
          >
            <input
              type="radio"
              name="bracket-mode"
              value={option.value}
              checked={active}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className={styles.srOnly}
            />
            <div className={styles.optionHeader}>
              <span className={styles.optionTitle}>{option.label}</span>
              <span className={styles.optionBadge}>{option.badge}</span>
            </div>
            <p className={styles.optionSummary}>{option.summary}</p>
            <ul className={styles.optionList}>
              {option.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </label>
        );
      })}
    </div>
  );
}
