"use client";

import React, { useEffect, useMemo, useState } from "react";
import { teamService } from "@/services/teamService";
import {
  canSelectRegisteredTeam,
  isTeamNameTakenInBracket,
  validateBracketRoster,
} from "@/lib/tournamentTeamRules";
import {
  isOfficialBracketSize,
  isValidFreeTeamCount,
  getBracketTeamCountStatus,
  MAX_TOURNAMENT_TEAMS,
  MIN_TOURNAMENT_TEAMS,
} from "@/lib/tournamentBracket";
import styles from "./team-picker.module.css";

const PAGE_SIZE = 40;

export function isValidBracketSize(total) {
  return isOfficialBracketSize(total);
}

function teamCoverUrl(team) {
  if (team?.logo) return team.logo;
  const name = encodeURIComponent(team?.name || "Team");
  return `https://ui-avatars.com/api/?name=${name}&background=random&size=128`;
}

export default function TeamPicker({
  sport,
  value,
  onChange,
  allowCustom = true,
  maxTotal = allowCustom ? MAX_TOURNAMENT_TEAMS : 16,
}) {
  const [customName, setCustomName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customError, setCustomError] = useState("");

  const teams = value.teams || [];
  const customNames = value.customNames || [];
  const total = teams.length + customNames.length;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!sport) {
      setResults([]);
      setHasMore(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setOffset(0);

    teamService
      .searchTeams({ sport, query: debouncedQuery, limit: PAGE_SIZE, offset: 0 })
      .then((rows) => {
        if (cancelled) return;
        setResults(rows);
        setHasMore(rows.length === PAGE_SIZE);
        setOffset(rows.length);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sport, debouncedQuery]);

  const rosterErrors = useMemo(
    () => validateBracketRoster({ teams, customNames, allowCustom }).errors,
    [teams, customNames, allowCustom]
  );

  const toggleTeam = (team) => {
    if (teams.find((t) => t.id === team.id)) {
      onChange({ teams: teams.filter((t) => t.id !== team.id), customNames });
      return;
    }
    if (total >= maxTotal) return;
    if (!canSelectRegisteredTeam(team, { teams, customNames })) return;
    onChange({ teams: [...teams, team], customNames });
  };

  const loadMore = async () => {
    if (!sport || loading || !hasMore) return;
    setLoading(true);
    try {
      const rows = await teamService.searchTeams({
        sport,
        query: debouncedQuery,
        limit: PAGE_SIZE,
        offset,
      });
      setResults((prev) => [...prev, ...rows]);
      setOffset((prev) => prev + rows.length);
      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  };

  const addCustom = () => {
    const name = customName.trim();
    setCustomError("");
    if (!name || total >= maxTotal) return;
    if (isTeamNameTakenInBracket(name, { teams, customNames })) {
      setCustomError(`"${name}" matches a team already in this bracket.`);
      return;
    }
    onChange({ teams, customNames: [...customNames, name] });
    setCustomName("");
  };

  const removeCustom = (name) => {
    onChange({ teams, customNames: customNames.filter((n) => n !== name) });
    setCustomError("");
  };

  const isValid = allowCustom
    ? isValidFreeTeamCount(total) && rosterErrors.length === 0
    : isValidBracketSize(total) && rosterErrors.length === 0;

  const countStatus = getBracketTeamCountStatus({
    count: total,
    tournamentType: allowCustom ? "free" : "official",
  });

  return (
    <div className={styles.picker}>
      <p className={styles.sectionLabel}>Registered teams</p>
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={`Search ${sport || "sport"} teams…`}
        className={styles.searchInput}
        aria-label="Search registered teams"
        disabled={!sport}
      />

      <div className={styles.teamScroll}>
        <div className={styles.teamGrid} role="listbox" aria-label="Registered teams">
          {loading && results.length === 0 && (
            <div className={styles.emptyHint}>Searching teams…</div>
          )}
          {!loading && results.length === 0 && (
            <div className={styles.emptyHint}>
              {allowCustom
                ? `No registered ${sport} teams found — add custom teams below.`
                : `No registered ${sport} teams found.`}
            </div>
          )}
          {results.map((team) => {
            const isActive = Boolean(teams.find((t) => t.id === team.id));
            const nameConflict =
              !isActive && !canSelectRegisteredTeam(team, { teams, customNames });
            return (
              <button
                key={team.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => toggleTeam(team)}
                disabled={nameConflict && !isActive}
                className={`${styles.teamTile} ${isActive ? styles.teamTileActive : ""} ${nameConflict && !isActive ? styles.teamTileDisabled : ""}`}
                title={
                  nameConflict && !isActive
                    ? "A team with this name is already in the bracket"
                    : team.name
                }
              >
                <span className={styles.teamTileMedia}>
                  <img src={teamCoverUrl(team)} alt="" className={styles.teamTileImage} loading="lazy" />
                  {isActive && <span className={styles.teamTileCheck} aria-hidden="true">✓</span>}
                </span>
                <span className={styles.teamTileName}>{team.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {hasMore && (
        <button type="button" className="btn-secondary" onClick={loadMore} disabled={loading}>
          {loading ? "Loading…" : "Load more teams"}
        </button>
      )}

      {allowCustom && (
        <>
          <p className={styles.sectionLabel}>Custom teams</p>
          <p className={styles.helperText}>
            Pickup squads that aren&apos;t on AllStar. Names must be unique inside this bracket.
            Saved on this device only — not uploaded to the database.
          </p>
          <div className={styles.customRow}>
            <input
              type="text"
              value={customName}
              maxLength={60}
              onChange={(e) => {
                setCustomName(e.target.value);
                setCustomError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="e.g. Saturday Ballers"
              className={styles.customInput}
              aria-label="Custom team name"
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={addCustom}
              disabled={!customName.trim() || total >= maxTotal}
            >
              Add
            </button>
          </div>
          {customError && <p className={styles.errorText}>{customError}</p>}

          {customNames.length > 0 && (
            <div className={styles.chips}>
              {customNames.map((name) => (
                <span key={name} className={styles.chip}>
                  {name}
                  <button
                    type="button"
                    onClick={() => removeCustom(name)}
                    className={styles.chipRemove}
                    aria-label={`Remove ${name}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {rosterErrors.length > 0 && (
        <p className={styles.errorText}>{rosterErrors[0]}</p>
      )}

      <div
        className={`${styles.counter} ${isValid ? styles.counterValid : styles.counterInvalid}`}
        role="status"
      >
        {total} of {maxTotal} —{" "}
        {allowCustom ? (
          <>use <strong>{MIN_TOURNAMENT_TEAMS}–{MAX_TOURNAMENT_TEAMS}</strong> unique teams</>
        ) : (
          <>pick <strong>4, 8, or 16</strong> unique registered teams</>
        )}
        {!isValid && rosterErrors.length === 0 && (
          <span className={styles.counterHint}> {countStatus.message}</span>
        )}
      </div>
    </div>
  );
}
