"use client";

import React, { useMemo } from "react";
import Icon from "@/components/UI/Icon";
import { buildTournamentLeaderboard } from "@/lib/tournamentLeaderboard";
import styles from "@/app/tournaments/[id]/tournaments.module.css";

function getTeamInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

function TeamAvatar({ team }) {
  if (team?.logo) {
    return <img src={team.logo} alt="" className={styles.leaderboardAvatar} />;
  }
  return (
    <span className={styles.leaderboardAvatarFallback} aria-hidden="true">
      {getTeamInitial(team?.name)}
    </span>
  );
}

function rankClass(rank) {
  if (rank === 1) return styles.leaderboardRowFirst;
  if (rank === 2) return styles.leaderboardRowSecond;
  if (rank === 3) return styles.leaderboardRowThird;
  return "";
}

function TeamName({ team }) {
  const isOfficial = team && !team.is_guest && !team.is_local;

  if (isOfficial) {
    return (
      <a
        href={`/teams/${team.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.leaderboardName} ${styles.leaderboardTeamLink}`}
        title={`Open ${team.name} roster in new tab`}
      >
        {team.name}
      </a>
    );
  }

  return <span className={styles.leaderboardName}>{team.name}</span>;
}

function statusClass(status) {
  if (status === "Champion") return styles.leaderboardStatusChampion;
  if (status === "Active") return styles.leaderboardStatusActive;
  if (status === "Eliminated") return styles.leaderboardStatusEliminated;
  return styles.leaderboardStatusWaiting;
}

export default function TournamentLeaderboard({ teams = [], matches = [], champion = null }) {
  const leaderboard = useMemo(
    () => buildTournamentLeaderboard(teams, matches, champion),
    [teams, matches, champion]
  );

  if (leaderboard.length === 0) return null;

  return (
    <div className={`glass-panel ticket-card ${styles.leaderboardCard}`}>
      <div className={styles.leaderboardHeader}>
        <h3 className={styles.cardTitle}>Leaderboard</h3>
        <p className={styles.leaderboardSubtitle}>Ranked by wins, then fewest losses</p>
      </div>

      <ol className={styles.leaderboardList}>
        {leaderboard.map((entry) => (
          <li
            key={entry.team.id}
            className={`${styles.leaderboardRow} ${rankClass(entry.rank)} ${entry.isChampion ? styles.leaderboardRowChampion : ""}`}
          >
            <span className={styles.leaderboardRank} aria-label={`Rank ${entry.rank}`}>
              {entry.rank === 1 ? (
                <Icon name="trophy" size={14} className="icon-inline" aria-hidden="true" />
              ) : (
                entry.rank
              )}
            </span>

            <TeamAvatar team={entry.team} />

            <div className={styles.leaderboardMain}>
              <TeamName team={entry.team} />
              <span className={`${styles.leaderboardStatus} ${statusClass(entry.status)}`}>
                {entry.status}
              </span>
            </div>

            <div className={styles.leaderboardRecord} aria-label={`${entry.wins} wins, ${entry.losses} losses`}>
              <span className={styles.leaderboardWins}>{entry.wins}</span>
              <span className={styles.leaderboardRecordSep}>–</span>
              <span className={styles.leaderboardLosses}>{entry.losses}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
