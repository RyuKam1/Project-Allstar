"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/UI/Icon";
import { tournamentService } from "@/services/tournamentService";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import { useAuth } from "@/context/AuthContext";
import {
  canRemoveTeamFromBracket,
  getBracketTeamCountStatus,
  getPreviewExcludedTeamId,
  MAX_TOURNAMENT_TEAMS,
  MIN_TOURNAMENT_TEAMS,
  orderTeamsByRecord,
} from "@/lib/tournamentBracket";
import {
  clearGuestRoster,
  loadGuestRoster,
} from "@/lib/guestTeamRosterStorage";
import {
  addLocalCustomTeam,
  isLocalTeamId,
  loadLocalCustomTeams,
  mergeTournamentWithLocalData,
  removeLocalCustomTeam,
  toLocalTeamRecord,
} from "@/lib/localCustomTeamsStorage";
import { isTeamNameTakenInBracket } from "@/lib/tournamentTeamRules";
import { isShortBracketMode } from "@/lib/tournamentModes";
import styles from "./customTeamsPanel.module.css";

function getTeamInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

export default function CustomTeamsPanel({
  tournament,
  isAdmin,
  canManageTeams,
  tournamentStarted = false,
  onUpdated,
}) {
  const { user } = useAuth();
  const { notify, confirm } = useNotificationCenter();
  const [addOpen, setAddOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [localTeams, setLocalTeams] = useState([]);

  useEffect(() => {
    setLocalTeams(loadLocalCustomTeams(tournament.id));
  }, [tournament.id, tournament.bracket_status]);

  const registeredTeams = useMemo(
    () =>
      (tournament.teams || []).filter(
        (team) => !team?.is_guest && !isLocalTeamId(team?.id),
      ),
    [tournament.teams],
  );
  const customTeams = useMemo(
    () => localTeams.map(toLocalTeamRecord),
    [localTeams],
  );
  const allTeams = useMemo(
    () => [...registeredTeams, ...customTeams],
    [registeredTeams, customTeams],
  );
  const autoSeededTeams = useMemo(
    () => orderTeamsByRecord(allTeams),
    [allTeams],
  );

  const bracketChanged = (tournament.bracket_status || "synced") === "changed";
  const shortMode = isShortBracketMode(tournament);
  const previewExcludedId = getPreviewExcludedTeamId(allTeams);
  const isOddCount = allTeams.length % 2 !== 0;
  const canAddMore = canManageTeams && allTeams.length < MAX_TOURNAMENT_TEAMS;
  const canApply =
    canManageTeams && bracketChanged && allTeams.length >= MIN_TOURNAMENT_TEAMS;
  const teamCountStatus = getBracketTeamCountStatus({
    count: allTeams.length,
    tournamentType: "free",
  });
  const canRemoveTeam = canRemoveTeamFromBracket(allTeams.length);

  const refreshTournament = async () => {
    const refreshed = await tournamentService.getTournamentById(tournament.id);
    onUpdated(mergeTournamentWithLocalData(refreshed));
    setLocalTeams(loadLocalCustomTeams(tournament.id));
  };

  const closeAddForm = () => {
    setAddOpen(false);
    setTeamName("");
    setError("");
  };

  const handleAdd = async (event) => {
    event?.preventDefault();
    const trimmed = teamName.trim();
    if (!trimmed || busy || !user) return;

    if (allTeams.length >= MAX_TOURNAMENT_TEAMS) {
      setError(`This tournament supports up to ${MAX_TOURNAMENT_TEAMS} teams.`);
      return;
    }
    if (
      isTeamNameTakenInBracket(trimmed, {
        teams: registeredTeams,
        customNames: localTeams.map((team) => team.name),
      })
    ) {
      setError(`"${trimmed}" matches a team already in this bracket.`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      addLocalCustomTeam(tournament.id, trimmed);
      await tournamentService.notifyLocalTeamListChanged(tournament.id, user);
      notify(
        `Added "${trimmed}". Saved on this device only — apply changes when you're ready to refresh the bracket.`,
        "success",
      );
      closeAddForm();
      await refreshTournament();
    } catch (err) {
      setError(err.message || "Could not add custom team.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (team) => {
    const ok = await confirm(
      `Remove custom team "${team.name}" from this tournament?`,
      {
        confirmLabel: "Remove",
        cancelLabel: "Cancel",
      },
    );
    if (!ok || !user) return;

    setBusy(true);
    try {
      removeLocalCustomTeam(tournament.id, team.id);
      clearGuestRoster(tournament.id, team.id);
      await tournamentService.notifyLocalTeamListChanged(tournament.id, user);
      notify(
        `Removed "${team.name}". Apply changes to refresh the bracket.`,
        "success",
      );
      await refreshTournament();
    } catch (err) {
      notify(err.message || "Could not remove custom team.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleApplyRandom = async () => {
    if (!user || !canApply) return;

    setBusy(true);
    try {
      const updated = await tournamentService.applyBracketChanges(
        tournament.id,
        user,
        { mode: "random", localCustomTeams: loadLocalCustomTeams(tournament.id) },
      );
      notify("Bracket set with a random draw.", "success");
      onUpdated(mergeTournamentWithLocalData(updated));
      setLocalTeams(loadLocalCustomTeams(tournament.id));
    } catch (err) {
      notify(err.message || "Could not apply bracket changes.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleApplyStandardSeeding = async () => {
    if (!user || !canApply) return;

    setBusy(true);
    try {
      const updated = await tournamentService.applyBracketChanges(
        tournament.id,
        user,
        {
          mode: "seeded",
          localCustomTeams: loadLocalCustomTeams(tournament.id),
        },
      );
      notify("Bracket set with automatic standard seeding.", "success");
      onUpdated(mergeTournamentWithLocalData(updated));
      setLocalTeams(loadLocalCustomTeams(tournament.id));
    } catch (err) {
      notify(err.message || "Could not apply seeded bracket.", "error");
    } finally {
      setBusy(false);
    }
  };

  const renderCustomTeamRow = (team) => {
    const roster = loadGuestRoster(tournament.id, team.id);
    const playerCount = roster.players.length;
    const isExcludedPreview =
      bracketChanged && isOddCount && team.id === previewExcludedId;

    return (
      <li
        key={team.id}
        className={`${styles.teamRow} ${isExcludedPreview ? styles.teamRowExcluded : ""}`}
      >
        <span className={styles.teamMark} aria-hidden="true">
          {getTeamInitial(team.name)}
        </span>
        <div className={styles.teamMain}>
          <span className={styles.teamName}>{team.name}</span>
          <span className={styles.teamMeta}>
            {playerCount} {playerCount === 1 ? "player" : "players"} · saved on
            this device
            {isExcludedPreview && " · sits out when applied"}
          </span>
        </div>
        <div className={styles.teamActions}>
          <Link
            href={`/tournaments/${tournament.id}/custom-teams/${team.id}`}
            className={styles.rosterLink}
          >
            <Icon name="edit" size={12} aria-hidden="true" />
            Roster
          </Link>
          {canManageTeams && (
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => handleRemove(team)}
              disabled={busy || !canRemoveTeam}
              title={
                !canRemoveTeam
                  ? `Keep at least ${MIN_TOURNAMENT_TEAMS} teams in this bracket`
                  : undefined
              }
              aria-label={`Remove ${team.name}`}
            >
              <Icon name="x" size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </li>
    );
  };

  const panelInfoText = tournamentStarted
    ? "Tournament in progress — use Reset bracket above the bracket to change teams or clear results."
    : canManageTeams
      ? shortMode
        ? "Short tournament: at least 4 teams, head-to-head round 1, one loss and you are out. Seeds are assigned automatically."
        : "Full tournament: single elimination plus a 3rd-place match when semifinals finish. Seeds are assigned automatically."
      : "Pickup squads saved locally for this friendly bracket.";

  return (
    <div
      className={`glass-panel ticket-card ${styles.customPanel} ${bracketChanged ? styles.customPanelChanged : ""}`}
    >
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.titleRow}>
            <h3 className={styles.panelTitle}>Custom teams</h3>
            <span className={styles.infoWrap}>
              <button
                type="button"
                className={styles.infoBtn}
                aria-label="How custom teams work"
              >
                <Icon name="info" size={14} aria-hidden="true" />
              </button>
              <span className={styles.infoTooltip} role="tooltip">
                {panelInfoText}
              </span>
            </span>
            {bracketChanged && (
              <span className={styles.changedBadge}>Changed</span>
            )}
          </div>
        </div>
        {canManageTeams && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => {
              if (addOpen) closeAddForm();
              else setAddOpen(true);
            }}
            disabled={!canAddMore || busy}
            aria-expanded={addOpen}
          >
            <Icon name="plus" size={14} aria-hidden="true" />
            {addOpen ? "Close" : "Add"}
          </button>
        )}
      </div>

      {canManageTeams && !teamCountStatus.valid && (
        <div className={styles.startedBanner}>
          <p>{teamCountStatus.message} Bracket apply stays locked until you reach {MIN_TOURNAMENT_TEAMS} teams.</p>
        </div>
      )}

      {tournamentStarted && isAdmin && (
        <div className={styles.startedBanner}>
          <p>
            This tournament has started. Team changes are locked until you reset
            the bracket — use the Reset button above the bracket to clear results
            and reshuffle teams.
          </p>
        </div>
      )}

      {bracketChanged && canManageTeams && (
        <div className={styles.changedBanner}>
          <p>
            Team list changed. Rebuild the bracket below — use a random draw like
            a live selection, or apply standard seeding for automatic 1-vs-8 style
            matchups on 4, 8, or 16 teams.
            {!shortMode && " Full tournaments also include a 3rd-place match after semifinals."}
          </p>
          {isOddCount && (
            <p className={styles.oddWarning}>
              Odd team count: one team will sit out when you apply. The
              highlighted team is the current preview.
            </p>
          )}
          <div className={styles.actionBar}>
            <button
              type="button"
              className={styles.applyBtn}
              onClick={handleApplyRandom}
              disabled={!canApply || busy}
            >
              Random draw
            </button>
            <button
              type="button"
              className={`${styles.sortBtn} ${styles.sortBtnDisabled}`}
              disabled
              title="Seeds are assigned automatically and cannot be edited"
              aria-disabled="true"
            >
              Set seeds
            </button>
            <button
              type="button"
              className={styles.applySeededBtn}
              onClick={handleApplyStandardSeeding}
              disabled={!canApply || busy}
            >
              Apply standard seeding
            </button>
          </div>
        </div>
      )}

      {bracketChanged && canManageTeams && autoSeededTeams.length > 0 && (
        <div className={`${styles.seedPanel} ${styles.seedPanelReadOnly}`}>
          <p className={styles.seedHint}>
            Automatic seeds (read-only). Registered teams rank by win record; custom
            teams follow after. On 4/8/16-team fields we pair 1 vs lowest, 2 vs
            second-lowest, and so on.
          </p>
          <ol className={styles.seedList}>
            {autoSeededTeams.map((team, index) => (
              <li key={team.id} className={styles.seedRow}>
                <span className={styles.seedRank}>#{index + 1}</span>
                <span className={styles.seedName}>{team.name}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {canManageTeams && (
        <div
          className={`${styles.addFormWrap} ${addOpen ? styles.addFormWrapOpen : ""}`}
        >
          <div className={styles.addFormInner}>
            <form className={styles.addForm} onSubmit={handleAdd}>
              <input
                type="text"
                value={teamName}
                maxLength={60}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  setError("");
                }}
                placeholder="Custom team name"
                className={styles.customInput}
                aria-label="Custom team name"
              />
              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={!teamName.trim() || busy}
                >
                  Add
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={closeAddForm}
                >
                  Cancel
                </button>
              </div>
            </form>
            {error && <p className={styles.errorText}>{error}</p>}
          </div>
        </div>
      )}

      {customTeams.length === 0 ? (
        <p className={styles.emptyState}>
          No custom teams yet. Add pickup squads — they are stored on this device, not in the database.
        </p>
      ) : (
        <ul className={styles.teamList}>
          {customTeams.map((team) => renderCustomTeamRow(team))}
        </ul>
      )}

      {!canManageTeams && !tournamentStarted && customTeams.length > 0 && (
        <p className={styles.lockedNote}>
          Custom rosters are edited by the tournament creator and saved locally
          in your browser.
        </p>
      )}
    </div>
  );
}
